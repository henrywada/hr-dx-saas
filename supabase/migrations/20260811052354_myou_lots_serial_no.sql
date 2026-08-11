-- mYou ロットにシリアルNoを保存する
-- 背景: 入荷QRの形式変更（LOT:<ロット番号>,MFG:<製造日>,NO:<シリアルNo>。LOT必須、他任意）で
-- 追加されたシリアルNoを、これまでは入荷処理画面の表示のみに使い、DBには保存していなかった。
-- 在庫一覧にシリアルNo列を表示するため、myou_lots に保存する。
-- 複数回の分割入荷で異なるシリアルNoがスキャンされる場合があるため、新規ロット作成時のみ記録し、
-- 既存ロットへの数量加算時は上書きしない（最初の入荷時の値を維持する）。

ALTER TABLE public.myou_lots ADD COLUMN IF NOT EXISTS serial_no text;
COMMENT ON COLUMN public.myou_lots.serial_no IS
  '入荷QRのNo（シリアルNo、任意項目）。新規ロット作成時のみ記録し、以降の追加入荷では上書きしない';

-- 末尾にDEFAULT付きパラメータを追加してもPostgreSQLでは別シグネチャの関数として並存してしまう
-- （CREATE OR REPLACE では置き換えられない）ため、旧シグネチャを明示的に削除する。
DROP FUNCTION IF EXISTS public.myou_receive_lot(text, text, integer, date);

CREATE OR REPLACE FUNCTION public.myou_receive_lot(
    p_lot_no text,
    p_qr_payload text,
    p_quantity integer,
    p_received_at date,
    p_serial_no text DEFAULT NULL
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
            status, received_at, serial_no, tenant_id
        ) VALUES (
            p_lot_no, p_qr_payload, p_quantity, p_quantity,
            'in_stock', p_received_at, p_serial_no, current_tenant_id()
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

COMMENT ON FUNCTION public.myou_receive_lot IS 'mYou 入荷登録: ロットへの数量加算または新規ロット登録をアトミックに実行する（シリアルNoは新規ロット作成時のみ記録。有効期限は扱わない。RLS有効、行ロックで同時入荷時のlost updateを防止）';
