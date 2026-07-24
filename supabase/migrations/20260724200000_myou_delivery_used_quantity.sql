-- 出荷履歴の使用数（客先での使用実績）
ALTER TABLE public.myou_delivery_logs
  ADD COLUMN IF NOT EXISTS used_quantity integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'myou_delivery_logs_used_quantity_check'
  ) THEN
    ALTER TABLE public.myou_delivery_logs
      ADD CONSTRAINT myou_delivery_logs_used_quantity_check
      CHECK (used_quantity >= 0 AND used_quantity <= quantity);
  END IF;
END $$;

COMMENT ON COLUMN public.myou_delivery_logs.used_quantity IS
  '使用数（0以上・出荷数量以下。初期値0）';
