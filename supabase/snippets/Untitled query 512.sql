-- ① テスト用ストレスチェック期間を作成
INSERT INTO stress_check_periods (id, tenant_id, title, status, start_date, end_date)
SELECT 
  gen_random_uuid(),
  t.id,
  '2025年度第1回',
  'closed',
  '2025-07-01',
  '2025-07-31'
FROM tenants t
LIMIT 1
ON CONFLICT DO NOTHING;

-- ② 全従業員にテスト結果を投入（部署所属者のみ）
INSERT INTO stress_check_results (id, tenant_id, employee_id, period_id, score_a, score_b, score_c, score_d, is_high_stress)
SELECT
  gen_random_uuid(),
  e.tenant_id,
  e.id,
  sp.id,
  -- score_a: 仕事の負担（高いほど負担大、全国平均=50前後）
  40 + (random() * 30)::int,
  -- score_b: コントロール（高いほど良い）
  40 + (random() * 25)::int,
  -- score_c: 上司サポート（高いほど良い）
  45 + (random() * 20)::int,
  -- score_d: 同僚サポート（高いほど良い）
  45 + (random() * 20)::int,
  random() < 0.1  -- 10%を高ストレス
FROM employees e
JOIN stress_check_periods sp ON sp.tenant_id = e.tenant_id AND sp.title = '2025年度第1回'
WHERE e.division_id IS NOT NULL
ON CONFLICT DO NOTHING;
