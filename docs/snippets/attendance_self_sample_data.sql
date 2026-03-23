-- 勤怠確認画面（/attendance/self）用サンプル INSERT
-- Supabase SQL エディタで「自分のセッション」として実行する場合:
--   employees.user_id = auth.uid() の行に対して挿入します。

INSERT INTO public.work_time_records (
  tenant_id,
  employee_id,
  record_date,
  start_time,
  end_time,
  duration_minutes,
  is_holiday,
  source
)
SELECT
  e.tenant_id,
  e.id,
  '2026-03-20'::date,
  '2026-03-20T09:00:00+09:00'::timestamptz,
  '2026-03-20T18:00:00+09:00'::timestamptz,
  480,
  false,
  'qr'
FROM public.employees e
WHERE e.user_id = auth.uid()
LIMIT 1;

INSERT INTO public.work_time_records (
  tenant_id,
  employee_id,
  record_date,
  start_time,
  end_time,
  duration_minutes,
  is_holiday,
  source
)
SELECT
  e.tenant_id,
  e.id,
  '2026-03-21'::date,
  '2026-03-21T09:30:00+09:00'::timestamptz,
  '2026-03-21T19:00:00+09:00'::timestamptz,
  540,
  false,
  'csv'
FROM public.employees e
WHERE e.user_id = auth.uid()
LIMIT 1;

INSERT INTO public.overtime_monthly_stats (
  tenant_id,
  employee_id,
  period_month,
  overtime_minutes,
  holiday_minutes,
  total_minutes
)
SELECT
  e.tenant_id,
  e.id,
  '2026-03-01'::date,
  120,
  0,
  2400
FROM public.employees e
WHERE e.user_id = auth.uid()
LIMIT 1;

INSERT INTO public.overtime_alerts (
  tenant_id,
  employee_id,
  alert_type,
  alert_value,
  triggered_at,
  resolved_at
)
SELECT
  e.tenant_id,
  e.id,
  'monthly_overtime_warning',
  '{"record_date": "2026-03-21", "message": "サンプルアラート"}'::jsonb,
  '2026-03-21T10:00:00+09:00'::timestamptz,
  NULL
FROM public.employees e
WHERE e.user_id = auth.uid()
LIMIT 1;

-- 手動で UUID を指定する場合の例（上記と同じ内容）:
/*
INSERT INTO public.work_time_records (
  tenant_id, employee_id, record_date,
  start_time, end_time, duration_minutes, is_holiday, source
) VALUES (
  'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid,
  'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'::uuid,
  '2026-03-22',
  '2026-03-22T09:00:00+09:00',
  '2026-03-22T18:00:00+09:00',
  480,
  false,
  'pc_log'
);
*/
