-- =============================================================
-- mYou スキーマ堅牢化
--
--   1. myou_products の主キーを (tenant_id, serial_number) に複合化
--      シリアル番号（MS-YYYYMMDD-NNNN）はテナントごとの当日通番のため、
--      単独主キーのままだと複数テナントが同日に発行した時点で衝突する
--   2. myou_delivery_logs → myou_products への複合外部キー追加（孤児ログ防止）
--   3. 参照性能のための二次インデックス追加
--   4. 出荷登録（製品更新＋出荷履歴挿入）を単一トランザクションで行う RPC 関数
--
-- ※ 既存データの削除・変更は一切行わない。事前ガードで整合性を確認し、
--    不整合があれば例外で停止する（手動解消後に再実行）。
-- =============================================================

-- -------------------------------------------------------------
-- 0. 事前ガード
-- -------------------------------------------------------------

-- (tenant_id, serial_number) 単位で見ても重複が無いことを確認する
DO $$
DECLARE
    duplicate_count integer;
BEGIN
    SELECT count(*) INTO duplicate_count
    FROM (
        SELECT tenant_id, serial_number
        FROM public.myou_products
        GROUP BY tenant_id, serial_number
        HAVING count(*) > 1
    ) AS dup;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'myou_products に (tenant_id, serial_number) の重複が % 組あります。手動で解消してから再実行してください。', duplicate_count;
    END IF;
END $$;

-- 出荷ログに製品未登録の孤児行が無いことを確認する（外部キー追加の前提）
DO $$
DECLARE
    orphan_count integer;
BEGIN
    SELECT count(*) INTO orphan_count
    FROM public.myou_delivery_logs l
    LEFT JOIN public.myou_products p
        ON p.tenant_id = l.tenant_id AND p.serial_number = l.serial_number
    WHERE p.serial_number IS NULL;

    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'myou_delivery_logs に製品未登録の孤児行が % 件あります。手動で解消してから再実行してください。', orphan_count;
    END IF;
END $$;

-- -------------------------------------------------------------
-- 1. myou_products 主キーの複合化
-- -------------------------------------------------------------

-- 旧主キー（serial_number 単独）に依存する外部キーを先に撤去する
-- ※ クラウド環境にはローカルに無いレガシー FK
--   （myou_delivery_logs_serial_number_fkey）が存在するため、
--   myou_products を参照する FK を動的に列挙して削除する。
--   直後のステップ 2 で複合外部キーとして再作成する。
DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT conname, conrelid::regclass AS tbl
        FROM pg_constraint
        WHERE confrelid = 'public.myou_products'::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', fk.tbl, fk.conname);
    END LOOP;
END $$;

DO $$
DECLARE
    pk_name text;
    pk_cols text;
BEGIN
    SELECT c.conname,
           (SELECT string_agg(a.attname, ',' ORDER BY k.ord)
              FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
              JOIN pg_attribute a
                ON a.attrelid = c.conrelid AND a.attnum = k.attnum)
      INTO pk_name, pk_cols
    FROM pg_constraint c
    WHERE c.conrelid = 'public.myou_products'::regclass
      AND c.contype = 'p';

    -- 既に複合主キーなら何もしない（再実行時の冪等性）
    IF pk_cols = 'tenant_id,serial_number' THEN
        RETURN;
    END IF;

    IF pk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.myou_products DROP CONSTRAINT %I', pk_name);
    END IF;

    EXECUTE 'ALTER TABLE public.myou_products ADD CONSTRAINT myou_products_pkey PRIMARY KEY (tenant_id, serial_number)';
END $$;

-- -------------------------------------------------------------
-- 2. myou_delivery_logs → myou_products の複合外部キー
-- -------------------------------------------------------------

ALTER TABLE public.myou_delivery_logs
    DROP CONSTRAINT IF EXISTS myou_delivery_logs_product_fkey;

ALTER TABLE public.myou_delivery_logs
    ADD CONSTRAINT myou_delivery_logs_product_fkey
    FOREIGN KEY (tenant_id, serial_number)
    REFERENCES public.myou_products (tenant_id, serial_number);

-- -------------------------------------------------------------
-- 3. 二次インデックス
-- -------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_myou_companies_tenant
    ON public.myou_companies (tenant_id);

CREATE INDEX IF NOT EXISTS idx_myou_alert_logs_tenant_sent
    ON public.myou_alert_logs (tenant_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_myou_delivery_logs_tenant_company
    ON public.myou_delivery_logs (tenant_id, company_id);

-- -------------------------------------------------------------
-- 4. 出荷登録のアトミック化 RPC
--    製品の UPSERT と出荷履歴の INSERT を単一トランザクションで実行する。
--    SECURITY INVOKER のため RLS（テナント分離）は呼び出しユーザーの権限で適用される。
--    received_at（入荷日）は出荷時に上書きしない（入荷記録を保持する）。
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.myou_register_delivery(
    p_serial_number text,
    p_expiration_date date,
    p_company_id uuid,
    p_delivery_date date,
    p_delivered_by text,
    p_last_delivery_at timestamptz,
    p_registered_at timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.myou_products (
        serial_number,
        expiration_date,
        status,
        last_delivery_at,
        current_company_id,
        tenant_id
    ) VALUES (
        p_serial_number,
        p_expiration_date,
        'delivered',
        p_last_delivery_at,
        p_company_id,
        current_tenant_id()
    )
    ON CONFLICT (tenant_id, serial_number) DO UPDATE SET
        expiration_date = EXCLUDED.expiration_date,
        status = 'delivered',
        last_delivery_at = EXCLUDED.last_delivery_at,
        current_company_id = EXCLUDED.current_company_id;

    INSERT INTO public.myou_delivery_logs (
        serial_number,
        company_id,
        delivery_date,
        delivered_by,
        registered_at,
        tenant_id
    ) VALUES (
        p_serial_number,
        p_company_id,
        p_delivery_date,
        p_delivered_by,
        p_registered_at,
        current_tenant_id()
    );
END;
$$;

COMMENT ON FUNCTION public.myou_register_delivery IS 'mYou 出荷登録: 製品 UPSERT と出荷履歴 INSERT をアトミックに実行する（RLS 有効）';
