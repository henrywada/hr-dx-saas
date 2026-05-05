-- 最低人数閾値を 1 に下げる（dev テスト用）
INSERT INTO tenant_stress_settings (tenant_id, min_group_analysis_respondents)
SELECT id, 1 FROM tenants LIMIT 1
ON CONFLICT (tenant_id) DO UPDATE SET min_group_analysis_respondents = 1;
