-- ============================================================
-- myou 製造ロット在庫・トレーサビリティQR 全面再設計
-- 詳細: docs/implementation-plan-myou-lot-inventory-redesign.md
--
-- 個体シリアル管理（myou_products）を廃止し、製造ロット（段ボール単位）
-- ＋数量で在庫を管理する myou_lots に置き換える。
-- 客先出荷単位のトレーサビリティQR（myou_trace_labels）はロットに紐付け、
-- 個体シリアルではなく「1出荷イベント＝1行（quantity列で数量を保持）」に変更する。
-- 入荷（myou_receive_lot）・出荷（myou_deliver_from_lot）とも行ロックで
-- アトミックに数量を更新するRPC経由でのみ在庫を変更する。
--
-- myou_** のデータは開発中データにつき削除してよいことを確認済み
-- （他テーブルには一切影響しない）。
-- ============================================================

-- -------------------------------------------------------------
-- 1. myou_products の廃止（依存する外部キー・RPCも合わせて削除）
-- -------------------------------------------------------------

DROP FUNCTION IF EXISTS public.myou_register_delivery(text, date, uuid, date, text, timestamptz, timestamptz);

ALTER TABLE public.myou_delivery_logs
  DROP CONSTRAINT IF EXISTS myou_delivery_logs_product_fkey;

DROP TABLE IF EXISTS public.myou_products;

-- -------------------------------------------------------------
-- 2. myou_lots（製造ロット＝段ボール単位）新設
--    status: issued（ロットQR発行済・数量未確定）→ in_stock（入荷済・残数あり）
--            → depleted（残数0）
--    quantity_total/quantity_remaining は issueLot 時点では 0（数量未確定）で
--    予約され、receiveLot（入荷登録）で確定値に更新される。
-- -------------------------------------------------------------

CREATE TABLE public.myou_lots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL DEFAULT current_tenant_id(),
    lot_no text NOT NULL,
    qr_payload text NOT NULL,
    manufactured_date date,
    expiration_date date NOT NULL,
    quantity_total integer NOT NULL DEFAULT 0 CHECK (quantity_total >= 0),
    quantity_remaining integer NOT NULL DEFAULT 0 CHECK (quantity_remaining >= 0),
    status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'in_stock', 'depleted')),
    received_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT myou_lots_remaining_lte_total CHECK (quantity_remaining <= quantity_total),
    UNIQUE (tenant_id, lot_no)
);
CREATE INDEX idx_myou_lots_tenant_status_exp ON public.myou_lots USING btree (tenant_id, status, expiration_date);
ALTER TABLE public.myou_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant Isolation for myou_lots" ON public.myou_lots
    FOR ALL TO authenticated USING (tenant_id = current_tenant_id());

-- -------------------------------------------------------------
-- 3. myou_trace_labels 変更
--    個体シリアル（serial_number）を廃止し、ロット紐付け（lot_id）＋
--    払い出し数量（quantity）を持つ「出荷1件＝1行」の形に変更する。
--    事前ガード: 既存行があるとlot_idをNOT NULL化できずロールバックされるため、
--    その場合は明示的なエラーで停止する（myou_products同様に空である前提のため
--    ローカルでは通らないが、他環境で先に適用された場合の事故を防ぐ）。
-- -------------------------------------------------------------

DO $$
DECLARE
    existing_count integer;
BEGIN
    SELECT count(*) INTO existing_count FROM public.myou_trace_labels;
    IF existing_count > 0 THEN
        RAISE EXCEPTION 'myou_trace_labels に % 件の既存データがあります。lot_id NOT NULL 化の前に移行方針を確認してください。', existing_count;
    END IF;
END $$;

ALTER TABLE public.myou_trace_labels
    ADD COLUMN lot_id uuid REFERENCES public.myou_lots(id),
    ADD COLUMN quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0);

ALTER TABLE public.myou_trace_labels
    DROP COLUMN IF EXISTS serial_number;

ALTER TABLE public.myou_trace_labels
    ALTER COLUMN lot_id SET NOT NULL;

CREATE INDEX idx_myou_trace_labels_lot ON public.myou_trace_labels USING btree (lot_id);

-- -------------------------------------------------------------
-- 4. myou_delivery_logs 変更
--    個体シリアル（serial_number）を廃止し、ロット紐付け（lot_id）＋
--    出荷数量（quantity）を持つ形に変更する。
--    事前ガード: 上記と同様の理由。
-- -------------------------------------------------------------

DO $$
DECLARE
    existing_count integer;
BEGIN
    SELECT count(*) INTO existing_count FROM public.myou_delivery_logs;
    IF existing_count > 0 THEN
        RAISE EXCEPTION 'myou_delivery_logs に % 件の既存データがあります。lot_id NOT NULL 化の前に移行方針を確認してください。', existing_count;
    END IF;
END $$;

ALTER TABLE public.myou_delivery_logs
    ADD COLUMN lot_id uuid REFERENCES public.myou_lots(id),
    ADD COLUMN quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0);

ALTER TABLE public.myou_delivery_logs
    DROP COLUMN IF EXISTS serial_number;

ALTER TABLE public.myou_delivery_logs
    ALTER COLUMN lot_id SET NOT NULL;

DROP INDEX IF EXISTS idx_myou_delivery_logs_serial;
CREATE INDEX idx_myou_delivery_logs_lot ON public.myou_delivery_logs USING btree (lot_id);

-- -------------------------------------------------------------
-- 5. myou_alert_logs: target_serials → target_trace_nos に改名
--    （個体シリアルではなくトレーサビリティQR発行番号を記録するため）
-- -------------------------------------------------------------

ALTER TABLE public.myou_alert_logs
    RENAME COLUMN target_serials TO target_trace_nos;

-- -------------------------------------------------------------
-- 6. 出荷（ロット引当）のアトミック化 RPC
--    ロット残数の減算・出荷履歴・トレーサビリティQR発行を単一トランザクションで
--    実行する。行ロック（FOR UPDATE）により同時実行時の在庫過剰引当を防ぐ。
--    ロットをまたぐ自動引き当ては行わない（残数不足時は例外を返し、
--    呼び出し元で別ロットの再スキャンを促す）。
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.myou_deliver_from_lot(
    p_lot_no text,
    p_company_id uuid,
    p_quantity integer,
    p_delivered_by text,
    p_delivery_date date,
    p_trace_no text
) RETURNS TABLE (lot_id uuid, expiration_date date)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_lot_id uuid;
    v_remaining integer;
    v_expiration date;
BEGIN
    SELECT l.id, l.quantity_remaining, l.expiration_date
        INTO v_lot_id, v_remaining, v_expiration
    FROM public.myou_lots AS l
    WHERE l.tenant_id = current_tenant_id() AND l.lot_no = p_lot_no
    FOR UPDATE;

    IF v_lot_id IS NULL THEN
        RAISE EXCEPTION 'ロット % が見つかりません', p_lot_no;
    END IF;

    IF v_remaining < p_quantity THEN
        RAISE EXCEPTION '在庫数量が不足しています（残り%個）', v_remaining;
    END IF;

    -- p_company_id が呼び出し元と同一テナントの施工会社であることを検証する
    -- （本RPCはSECURITY INVOKERで直接呼び出し可能なため、テナント越境の出荷登録を防ぐ）
    IF NOT EXISTS (
        SELECT 1 FROM public.myou_companies c
        WHERE c.id = p_company_id AND c.tenant_id = current_tenant_id()
    ) THEN
        RAISE EXCEPTION '出荷先（施工会社）が見つかりません';
    END IF;

    UPDATE public.myou_lots
    SET quantity_remaining = quantity_remaining - p_quantity,
        status = CASE WHEN quantity_remaining - p_quantity = 0 THEN 'depleted' ELSE 'in_stock' END
    WHERE id = v_lot_id;

    INSERT INTO public.myou_delivery_logs (
        lot_id, company_id, quantity, delivery_date, delivered_by, tenant_id
    ) VALUES (
        v_lot_id, p_company_id, p_quantity, p_delivery_date, p_delivered_by, current_tenant_id()
    );

    INSERT INTO public.myou_trace_labels (
        tenant_id, company_id, lot_id, quantity, expiration_date, trace_no
    ) VALUES (
        current_tenant_id(), p_company_id, v_lot_id, p_quantity, v_expiration, p_trace_no
    );

    RETURN QUERY SELECT v_lot_id, v_expiration;
END;
$$;

COMMENT ON FUNCTION public.myou_deliver_from_lot IS 'mYou 出荷登録（ロット引当）: ロット残数の減算・出荷履歴・トレーサビリティQR発行をアトミックに実行する（RLS有効、行ロックで同時実行時の過剰引当を防止）';
COMMENT ON TABLE public.myou_lots IS '製造ロット（段ボール単位）の在庫。lot_no＋quantity_remainingで在庫を管理する';

-- -------------------------------------------------------------
-- 7. 入荷登録のアトミック化 RPC
--    スキャン済みロットへの数量加算・新規ロット登録を単一トランザクションで
--    実行する。行ロック（FOR UPDATE）により、同一ロットへの同時入荷登録で
--    数量加算が失われる（lost update）事故を防ぐ。
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.myou_receive_lot(
    p_lot_no text,
    p_qr_payload text,
    p_expiration_date date,
    p_quantity integer,
    p_received_at date
) RETURNS TABLE (lot_id uuid, is_new boolean, previous_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_lot_id uuid;
    v_status text;
BEGIN
    SELECT l.id, l.status INTO v_lot_id, v_status
    FROM public.myou_lots AS l
    WHERE l.tenant_id = current_tenant_id() AND l.lot_no = p_lot_no
    FOR UPDATE;

    IF v_lot_id IS NULL THEN
        INSERT INTO public.myou_lots (
            lot_no, qr_payload, expiration_date, quantity_total, quantity_remaining,
            status, received_at, tenant_id
        ) VALUES (
            p_lot_no, p_qr_payload, p_expiration_date, p_quantity, p_quantity,
            'in_stock', p_received_at, current_tenant_id()
        )
        RETURNING id INTO v_lot_id;

        RETURN QUERY SELECT v_lot_id, true, NULL::text;
        RETURN;
    END IF;

    UPDATE public.myou_lots
    SET quantity_total = quantity_total + p_quantity,
        quantity_remaining = quantity_remaining + p_quantity,
        expiration_date = p_expiration_date,
        status = 'in_stock',
        received_at = p_received_at
    WHERE id = v_lot_id;

    RETURN QUERY SELECT v_lot_id, false, v_status;
END;
$$;

COMMENT ON FUNCTION public.myou_receive_lot IS 'mYou 入荷登録: ロットへの数量加算または新規ロット登録をアトミックに実行する（RLS有効、行ロックで同時入荷時のlost updateを防止）';
