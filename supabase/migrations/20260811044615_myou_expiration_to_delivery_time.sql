-- mYou 有効期限の入力タイミングを「入荷時」→「出荷時」に変更
-- 背景: 入荷QRの形式変更（LOT必須,MFG/NO任意）で有効期限がQRから読み取れなくなったため、
-- 入荷時の毎回手入力をやめ、出荷（トレーサビリティラベル発行）時に入力する運用に変更する。
-- myou_lots は今後 expiration_date を持たない（常にNULL、列は互換のため残置）。
-- myou_** のデータは開発中データにつき削除してよいことを確認済み（20260719120000参照）。

ALTER TABLE public.myou_lots ALTER COLUMN expiration_date DROP NOT NULL;
UPDATE public.myou_lots SET expiration_date = NULL;
COMMENT ON COLUMN public.myou_lots.expiration_date IS
  '廃止予定・常にNULL（有効期限は出荷時に myou_trace_labels.expiration_date / myou_delivery_logs.expiration_date へ記録する方式に変更。列は互換のため残置）';

ALTER TABLE public.myou_delivery_logs ADD COLUMN IF NOT EXISTS expiration_date date;
COMMENT ON COLUMN public.myou_delivery_logs.expiration_date IS
  '出荷登録時に入力された有効期限（myou_trace_labels.expiration_date と同一値、表示用）';

-- myou_receive_lot: p_expiration_date を削除（シグネチャ変更のためDROP必須）
DROP FUNCTION IF EXISTS public.myou_receive_lot(text, text, date, integer, date);

CREATE OR REPLACE FUNCTION public.myou_receive_lot(
    p_lot_no text,
    p_qr_payload text,
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
            lot_no, qr_payload, quantity_total, quantity_remaining,
            status, received_at, tenant_id
        ) VALUES (
            p_lot_no, p_qr_payload, p_quantity, p_quantity,
            'in_stock', p_received_at, current_tenant_id()
        )
        RETURNING id INTO v_lot_id;

        RETURN QUERY SELECT v_lot_id, true, NULL::text;
        RETURN;
    END IF;

    UPDATE public.myou_lots
    SET quantity_total = quantity_total + p_quantity,
        quantity_remaining = quantity_remaining + p_quantity,
        status = 'in_stock',
        received_at = p_received_at
    WHERE id = v_lot_id;

    RETURN QUERY SELECT v_lot_id, false, v_status;
END;
$$;

COMMENT ON FUNCTION public.myou_receive_lot IS 'mYou 入荷登録: ロットへの数量加算または新規ロット登録をアトミックに実行する（有効期限は扱わない。RLS有効、行ロックで同時入荷時のlost updateを防止）';

-- myou_deliver_from_lot: p_expiration_date を新設し、ロットからの読み取りをやめて入力値を記録する
DROP FUNCTION IF EXISTS public.myou_deliver_from_lot(text, uuid, integer, text, date, text, text, uuid);

CREATE OR REPLACE FUNCTION public.myou_deliver_from_lot(
    p_lot_no text,
    p_company_id uuid,
    p_quantity integer,
    p_delivered_by text,
    p_delivery_date date,
    p_trace_no text,
    p_expiration_date date,
    p_customer_order_no text DEFAULT NULL,
    p_trace_label_id uuid DEFAULT NULL
) RETURNS TABLE (lot_id uuid, expiration_date date)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_lot_id uuid;
    v_remaining integer;
BEGIN
    SELECT l.id, l.quantity_remaining
        INTO v_lot_id, v_remaining
    FROM public.myou_lots AS l
    WHERE l.tenant_id = current_tenant_id() AND l.lot_no = p_lot_no
    FOR UPDATE;

    IF v_lot_id IS NULL THEN
        RAISE EXCEPTION 'ロット % が見つかりません', p_lot_no;
    END IF;

    IF v_remaining < p_quantity THEN
        RAISE EXCEPTION '在庫数量が不足しています（残り%個）', v_remaining;
    END IF;

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
        lot_id, company_id, quantity, delivery_date, delivered_by, tenant_id,
        customer_order_no, trace_no, expiration_date
    ) VALUES (
        v_lot_id, p_company_id, p_quantity, p_delivery_date, p_delivered_by, current_tenant_id(),
        p_customer_order_no, p_trace_no, p_expiration_date
    );

    INSERT INTO public.myou_trace_labels (
        id, tenant_id, company_id, lot_id, quantity, expiration_date, trace_no
    ) VALUES (
        COALESCE(p_trace_label_id, gen_random_uuid()), current_tenant_id(), p_company_id, v_lot_id, p_quantity, p_expiration_date, p_trace_no
    );

    RETURN QUERY SELECT v_lot_id, p_expiration_date;
END;
$$;

COMMENT ON FUNCTION public.myou_deliver_from_lot IS 'mYou 出荷登録（ロット引当）: 有効期限（出荷時入力）を含め、ロット残数の減算・出荷履歴・トレーサビリティQR発行をアトミックに実行する（RLS有効、行ロックで同時実行時の過剰引当を防止）';
