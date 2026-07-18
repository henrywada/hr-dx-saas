-- TraceNoの重複防止（テナント内で一意）。myou_companies.company_no と同じ方式。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'myou_trace_labels_tenant_trace_no_key'
    ) THEN
        ALTER TABLE public.myou_trace_labels
            ADD CONSTRAINT myou_trace_labels_tenant_trace_no_key UNIQUE (tenant_id, trace_no);
    END IF;
END $$;

COMMENT ON TABLE public.myou_trace_labels IS 'トレーサビリティQRラベルの発行履歴（発行のたび1件記録し、当日通番の採番元になる）';
