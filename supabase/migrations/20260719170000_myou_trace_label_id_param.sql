-- =============================================================
-- トレーサビリティQRを「URL」化するための下準備
--
-- スマホでスキャンした一般客にも表示できる公開ページ（/p/myou/trace/[id]）を
-- QRコードのURLとして発行するため、myou_trace_labels の行IDをアプリ側で
-- 事前採番（crypto.randomUUID）してRPCに渡せるようにする。
-- trace_no は tenant_id との複合ユニークにすぎず、テナントをまたいで
-- 一意に特定できないため、公開ページの検索キーには使えない
-- （id は主キーでテナント非依存にグローバルに一意）。
-- =============================================================

DROP FUNCTION IF EXISTS public.myou_deliver_from_lot(text, uuid, integer, text, date, text, text);

CREATE OR REPLACE FUNCTION public.myou_deliver_from_lot(
    p_lot_no text,
    p_company_id uuid,
    p_quantity integer,
    p_delivered_by text,
    p_delivery_date date,
    p_trace_no text,
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
        id, tenant_id, company_id, lot_id, quantity, expiration_date, trace_no
    ) VALUES (
        COALESCE(p_trace_label_id, gen_random_uuid()), current_tenant_id(), p_company_id, v_lot_id, p_quantity, v_expiration, p_trace_no
    );

    RETURN QUERY SELECT v_lot_id, v_expiration;
END;
$$;

COMMENT ON FUNCTION public.myou_deliver_from_lot IS 'mYou 出荷登録（ロット引当）: ロット残数の減算・出荷履歴（客先注文番号・TraceNo含む）・トレーサビリティQR発行（行IDを呼び出し元から指定可）をアトミックに実行する（RLS有効、行ロックで同時実行時の過剰引当を防止）';
