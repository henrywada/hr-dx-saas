-- =============================================================
-- 出荷履歴（myou_delivery_logs）に TraceNo を記録する
--
-- 出荷登録時に発行される TraceNo（myou_trace_labels.trace_no）は、これまで
-- myou_delivery_logs との紐付けキーを持っていなかった（同一ロット・同一施工会社・
-- 同一数量の出荷が複数回あると一意に対応付けられない）。RPC が同一トランザクション内で
-- 既に trace_no を受け取っているため、myou_delivery_logs 側にもそのまま記録し、
-- 出荷リスト画面で「トレースNo」列として表示できるようにする。
-- 既存データは NULL のままとする（遡って一意に対応付けられないため）。
-- =============================================================

ALTER TABLE public.myou_delivery_logs
  ADD COLUMN IF NOT EXISTS trace_no text;

CREATE OR REPLACE FUNCTION public.myou_deliver_from_lot(
    p_lot_no text,
    p_company_id uuid,
    p_quantity integer,
    p_delivered_by text,
    p_delivery_date date,
    p_trace_no text,
    p_customer_order_no text DEFAULT NULL
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
        lot_id, company_id, quantity, delivery_date, delivered_by, tenant_id, customer_order_no, trace_no
    ) VALUES (
        v_lot_id, p_company_id, p_quantity, p_delivery_date, p_delivered_by, current_tenant_id(), p_customer_order_no, p_trace_no
    );

    INSERT INTO public.myou_trace_labels (
        tenant_id, company_id, lot_id, quantity, expiration_date, trace_no
    ) VALUES (
        current_tenant_id(), p_company_id, v_lot_id, p_quantity, v_expiration, p_trace_no
    );

    RETURN QUERY SELECT v_lot_id, v_expiration;
END;
$$;

COMMENT ON FUNCTION public.myou_deliver_from_lot IS 'mYou 出荷登録（ロット引当）: ロット残数の減算・出荷履歴（客先注文番号・TraceNo含む）・トレーサビリティQR発行をアトミックに実行する（RLS有効、行ロックで同時実行時の過剰引当を防止）';
