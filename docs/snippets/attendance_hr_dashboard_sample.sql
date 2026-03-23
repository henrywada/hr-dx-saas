-- 人事向け勤怠ダッシュボード（/adm/attendance/dashboard）用サンプルデータ
-- 同一テナントの複数従業員に対して月次集計・アラートを投入する例
--
-- 実行方法の例:
-- 1) Supabase SQL エディタで service_role 相当、または RLS をバイパスできるロールで実行
-- 2) 下記 :tenant_id を実テナント UUID に置換
-- 3) employees の id は既存行から SELECT して置換（または CTE で取得）

-- 対象テナントの従業員を最大5名取得（例）
/*
WITH e AS (
  SELECT id, tenant_id, name
  FROM public.employees
  WHERE tenant_id = :tenant_id::uuid
  ORDER BY id
  LIMIT 5
)
SELECT * FROM e;
*/

-- === 例: 変数を手で埋める場合 ===
-- :tenant_id, :e1 .. :e5 を UUID に置き換えて実行

INSERT INTO public.overtime_monthly_stats (
  tenant_id,
  employee_id,
  period_month,
  overtime_minutes,
  holiday_minutes,
  total_minutes
)
VALUES
  (:tenant_id, :e1, '2026-03-01', 50 * 60, 0, 200 * 60),
  (:tenant_id, :e2, '2026-03-01', 46 * 60, 30, 180 * 60),
  (:tenant_id, :e3, '2026-03-01', 70 * 60, 0, 220 * 60),
  (:tenant_id, :e4, '2026-03-01', 85 * 60, 120, 240 * 60),
  (:tenant_id, :e5, '2026-03-01', 20 * 60, 0, 160 * 60)
;

-- 6ヶ月平均・年間合算の判定用に過去月も投入（同じ従業員に対し period_month をずらす）
INSERT INTO public.overtime_monthly_stats (
  tenant_id, employee_id, period_month, overtime_minutes, holiday_minutes, total_minutes
)
VALUES
  (:tenant_id, :e4, '2026-02-01', 82 * 60, 0, 230 * 60),
  (:tenant_id, :e4, '2026-01-01', 90 * 60, 0, 235 * 60),
  (:tenant_id, :e5, '2026-02-01', 85 * 60, 0, 200 * 60),
  (:tenant_id, :e5, '2026-01-01', 88 * 60, 0, 205 * 60)
;

INSERT INTO public.overtime_alerts (
  tenant_id,
  employee_id,
  alert_type,
  alert_value,
  triggered_at,
  resolved_at
)
VALUES
  (
    :tenant_id,
    :e1,
    'monthly_ot_45_exceeded',
    jsonb_build_object('threshold_hours', 45, 'actual_hours', 50),
    '2026-03-15T10:00:00+09:00',
    NULL
  ),
  (
    :tenant_id,
    :e4,
    'monthly_ot_100_exceeded',
    jsonb_build_object('threshold_hours', 100, 'actual_hours', 102),
    '2026-03-18T09:30:00+09:00',
    NULL
  ),
  (
    :tenant_id,
    :e2,
    'rolling_6m_avg_80_exceeded',
    jsonb_build_object('threshold_hours', 80, 'actual_hours', 84, 'status', 'in_progress'),
    '2026-03-10T14:00:00+09:00',
    NULL
  ),
  (
    :tenant_id,
    :e3,
    'annual_ot_360_exceeded',
    jsonb_build_object('threshold_hours', 360, 'actual_hours', 370),
    '2026-03-22T11:00:00+09:00',
    NULL
  )
;

-- work_time_records のフォールバック確認用（月次行が無い従業員向け）
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
VALUES
  (
    :tenant_id,
    :e5,
    '2026-03-19',
    '2026-03-19T09:00:00+09:00',
    '2026-03-19T18:00:00+09:00',
    480,
    false,
    'sample'
  )
;
