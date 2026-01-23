-- 1. グローバルマスタデータの作成 (全テナント共通)
-- サービスカテゴリ (ID: c0... は有効)
INSERT INTO service_category (id, name, description) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Recruitment', '採用関連機能'),
  ('c0000000-0000-0000-0000-000000000002', 'Health Care', '健康管理機能');

-- サービス一覧
INSERT INTO service (name, service_category_id, category, description) VALUES
  ('AI Interviewer', 'c0000000-0000-0000-0000-000000000001', 'agent', '一次面接代行AIエージェント'),
  ('Stress Check AI', 'c0000000-0000-0000-0000-000000000002', 'analysis', '従業員ストレスチェック分析');


-- 2. テナントA (株式会社HRテック) の作成
-- ID修正: t0... -> a0... (aは16進数で有効)
INSERT INTO tenants (id, name, employee_count) VALUES
  ('a0000000-0000-0000-0000-000000000001', '株式会社HRテック', 50);

-- 部署 (テナントA)
-- ID修正: d0... は有効なのでそのまま利用
INSERT INTO divisions (id, tenant_id, name, layer, code) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '開発部', 1, 'DEV01'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '人事部', 1, 'HR01');

-- 従業員 (テナントA) - 管理者太郎
-- ID修正: e0... は有効なのでそのまま利用
INSERT INTO employees (id, tenant_id, division_id, name, app_role, is_contacted_person, contacted_date) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', '管理者 太郎', 'hr_manager', true, '2024-01-01');

-- 契約サービス (テナントA)
INSERT INTO tenant_service (tenant_id, service_id, start_date, status) 
  SELECT 'a0000000-0000-0000-0000-000000000001', id, '2024-01-01', 'active' FROM service WHERE name = 'AI Interviewer';


-- 3. テナントB (テストクライアントA社) の作成
-- ID修正: t0... -> b0... (bは16進数で有効)
INSERT INTO tenants (id, name, employee_count) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'テストクライアントA社', 100);

-- 部署 (テナントB)
INSERT INTO divisions (id, tenant_id, name, layer, code) VALUES
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '営業部', 1, 'SALES01');

-- 従業員 (テナントB) - 営業 花子
INSERT INTO employees (id, tenant_id, division_id, name, app_role) VALUES
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', '営業 花子', 'employee');