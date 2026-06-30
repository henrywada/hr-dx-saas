-- 1on1 / 評価 / スキル / eラーニング のメニュー表示用 service マスタ登録
-- 既存環境では route_path ごとに service 行が既にあるため、未登録分のみ INSERT する（冪等）。
-- カテゴリは同名の既存 service から解決し、サイドメニュー構成の不一致を避ける。

DO $$
DECLARE
  v_cat_1on1 uuid;
  v_cat_eval uuid;
  v_cat_skill uuid;
  v_cat_el uuid;
  v_class_id uuid;
BEGIN
  -- 既存 service からカテゴリを解決（無い場合のみ新規カテゴリを作成）
  SELECT service_category_id INTO v_cat_1on1
  FROM public.service WHERE trim(route_path) = '/adm/one-on-one' LIMIT 1;

  SELECT service_category_id INTO v_cat_eval
  FROM public.service WHERE trim(route_path) = '/adm/evaluation' LIMIT 1;

  SELECT service_category_id INTO v_cat_skill
  FROM public.service WHERE trim(route_path) = '/adm/skill-map' LIMIT 1;

  SELECT service_category_id INTO v_cat_el
  FROM public.service
  WHERE trim(route_path) IN ('/adm/el-courses', '/el-courses')
  ORDER BY CASE WHEN trim(route_path) = '/adm/el-courses' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT id INTO v_class_id FROM public.service_class WHERE name = '評価・成長' LIMIT 1;
  IF v_class_id IS NULL THEN
    INSERT INTO public.service_class (id, name, sort_order)
    VALUES (gen_random_uuid(), '評価・成長', 40)
    RETURNING id INTO v_class_id;
  END IF;

  IF v_cat_1on1 IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 410, '1on1')
    RETURNING id INTO v_cat_1on1;
  END IF;

  IF v_cat_eval IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 420, 'パフォーマンス評価')
    RETURNING id INTO v_cat_eval;
  END IF;

  IF v_cat_skill IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 430, 'スキル開発')
    RETURNING id INTO v_cat_skill;
  END IF;

  IF v_cat_el IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 440, 'eラーニング')
    RETURNING id INTO v_cat_el;
  END IF;

  -- service_class_index（無ければ作成）
  IF NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_cat_1on1
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_cat_1on1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_cat_eval
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_cat_eval);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_cat_skill
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_cat_skill);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_cat_el
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_cat_el);
  END IF;

  -- route_path ごとに未登録のみ INSERT
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/one-on-one') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_1on1, '1on1支援機能', '', '1on1支援機能', '部下との1on1記録・フォローアップを管理します。', 10, '/adm/one-on-one', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/my-one-on-one') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_1on1, 'マイ1on1', '', 'マイ1on1', '自分が受けた1on1の履歴を確認できます。', 20, '/my-one-on-one', 'all_users', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/evaluation') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_eval, '評価シート管理', '', '評価シート管理', '評価シートの一覧・進捗確認ができます。', 10, '/adm/evaluation', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/evaluation-periods') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_eval, '評価期間管理', '', '評価期間管理', '評価期間の作成・編集を行います。', 20, '/adm/evaluation-periods', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/evaluation-templates') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_eval, '評価テンプレート', '', '評価テンプレート', 'テナント固有の評価テンプレートを管理します。', 30, '/adm/evaluation-templates', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/evaluation-360') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_eval, '360度評価', '', '360度評価', '360度評価キャンペーンの管理を行います。', 40, '/adm/evaluation-360', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/evaluation/workflow') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_eval, '評価ワークフロー', '', '評価ワークフロー', '評価フローの進捗・承認状況を管理します。', 50, '/adm/evaluation/workflow', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/my-evaluation') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_eval, '自己評価', '', '自己評価', '自分の評価シートへの入力・確認ができます。', 60, '/my-evaluation', 'all_users', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/my-evaluation-360') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_eval, '360度評価 依頼', '', '360度評価 依頼一覧', '依頼された360度評価への回答ができます。', 70, '/my-evaluation-360', 'all_users', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/skill-map') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_skill, 'スキルマップ', '', 'スキルマップ', '職種・役割ごとのスキル要件を管理します。', 10, '/adm/skill-map', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/skill-tempCopy') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_skill, 'スキルテンプレート取込', '', 'スキルテンプレート取込', 'グローバルスキルテンプレートをテナントへ取り込みます。', 20, '/adm/skill-tempCopy', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/skill-map/applications') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_skill, 'スキル申請管理', '', 'スキル申請管理', '従業員からのスキル申請を確認・承認します。', 30, '/adm/skill-map/applications', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/skill-map/approvers') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_skill, 'スキル承認者設定', '', 'スキル承認者設定', 'スキル承認フローの承認者を設定します。', 40, '/adm/skill-map/approvers', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/my-skills') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_skill, 'マイスキル', '', 'マイスキル', '自分のスキルレベル・成長状況を確認できます。', 50, '/my-skills', 'all_users', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/skill-approvals') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_skill, 'スキル承認', '', 'スキル承認', '部下のスキル申請を承認します（上長向け）。', 60, '/skill-approvals', 'all_users', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/my-skills/journey') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_skill, '成長ジャーニー', '', '成長ジャーニー', 'スキル成長の道筋と相談履歴を確認できます。', 70, '/my-skills/journey', 'all_users', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/el-courses') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_el, 'eラーニングコース管理', '', 'eラーニングコース管理', 'コースの作成・編集・公開を行います。', 10, '/adm/el-courses', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/adm/el-assignments') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_el, 'eラーニング割当管理', '', 'eラーニング割当管理', '従業員へのコース割当・受講状況を管理します。', 20, '/adm/el-assignments', 'adm', '公開');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/el-courses') THEN
    INSERT INTO public.service (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (v_cat_el, 'eラーニング', '', 'eラーニング', '割り当てられたコースの受講・進捗確認ができます。', 30, '/el-courses', 'all_users', '公開');
  END IF;
END $$;

-- 人事ロール向け管理画面メニュー
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), ar.id, s.id
FROM public.app_role ar
CROSS JOIN public.service s
WHERE ar.app_role IN ('hr', 'hr_manager')
  AND s.target_audience = 'adm'
  AND trim(s.route_path) IN (
    '/adm/one-on-one',
    '/adm/evaluation',
    '/adm/evaluation-periods',
    '/adm/evaluation-templates',
    '/adm/evaluation-360',
    '/adm/evaluation/workflow',
    '/adm/skill-map',
    '/adm/skill-tempCopy',
    '/adm/skill-map/applications',
    '/adm/skill-map/approvers',
    '/adm/el-courses',
    '/adm/el-assignments'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = ar.id AND ars.service_id = s.id
  );

-- SaaS管理者（developer）にも管理画面メニューを表示
INSERT INTO public.app_role_service (id, app_role_id, service_id)
SELECT gen_random_uuid(), ar.id, s.id
FROM public.app_role ar
CROSS JOIN public.service s
WHERE ar.app_role = 'developer'
  AND s.target_audience = 'adm'
  AND trim(s.route_path) IN (
    '/adm/one-on-one',
    '/adm/evaluation',
    '/adm/evaluation-periods',
    '/adm/evaluation-templates',
    '/adm/evaluation-360',
    '/adm/evaluation/workflow',
    '/adm/skill-map',
    '/adm/skill-tempCopy',
    '/adm/skill-map/applications',
    '/adm/skill-map/approvers',
    '/adm/el-courses',
    '/adm/el-assignments'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = ar.id AND ars.service_id = s.id
  );

-- 既存テナント全件に service を付与（未付与分のみ）
INSERT INTO public.tenant_service (tenant_id, service_id)
SELECT t.id, s.id
FROM public.tenants t
CROSS JOIN public.service s
WHERE trim(s.route_path) IN (
  '/adm/one-on-one',
  '/my-one-on-one',
  '/adm/evaluation',
  '/adm/evaluation-periods',
  '/adm/evaluation-templates',
  '/adm/evaluation-360',
  '/adm/evaluation/workflow',
  '/my-evaluation',
  '/my-evaluation-360',
  '/adm/skill-map',
  '/adm/skill-tempCopy',
  '/adm/skill-map/applications',
  '/adm/skill-map/approvers',
  '/my-skills',
  '/skill-approvals',
  '/my-skills/journey',
  '/adm/el-courses',
  '/adm/el-assignments',
  '/el-courses'
)
AND NOT EXISTS (
  SELECT 1 FROM public.tenant_service ts
  WHERE ts.tenant_id = t.id AND ts.service_id = s.id
);
