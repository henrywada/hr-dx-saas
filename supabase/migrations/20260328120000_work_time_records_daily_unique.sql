-- 同一テナント・同一従業員・同一日の勤怠行を一意にし、CSV 取り込みの upsert を可能にする
-- 重複がある場合は最小 id の行のみ残す

DELETE FROM public.work_time_records a
USING public.work_time_records b
WHERE a.tenant_id = b.tenant_id
  AND a.employee_id = b.employee_id
  AND a.record_date = b.record_date
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_work_time_records_tenant_emp_date
  ON public.work_time_records (tenant_id, employee_id, record_date);

COMMENT ON INDEX public.uq_work_time_records_tenant_emp_date IS '1 日 1 従業員 1 行（CSV 取り込み・QR 打刻の upsert 用）';
