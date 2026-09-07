-- タスク管理（目標・マイルストーン・タスクグループ・タスク）のメニュー表示用マスタ登録
--
-- 参照した既存パターン:
--   - supabase/migrations/20260629160100_add_career_discussions_service_master.sql
--   - supabase/migrations/20260813120000_create_health_check.sql（サービスマスタ登録DOブロック）
--
-- 上記2件で確認した実際のスキーマは、Task2ブリーフのテンプレートSQLと以下の点で異なるため、
-- 実スキーマに合わせて調整した：
--   - テーブル名は `public.services` ではなく `public.service`（単数形）
--   - `service_category` に `service_class_id` カラムは無く、`service_class_index` という
--     中間テーブルで service_class と service_category を紐付ける
--   - `service` の列構成は
--     (id, service_category_id, name, category, title, description, sort_order,
--      route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status)
--   - route_path の重複有無で判定する冪等ガードは health_check 移行と同様
--     `trim(route_path) = '/tasks'` を使う
--
-- 画面構成（docs/implementation-plan-task-management.md 6節）は `(tenant-users)` 配下に
-- 一本化されており、責任者・タスクマネージャーも一般従業員がなり得るため app_role による
-- 画面分岐を行わない。そのため target_audience は 'all_users'、app_role_service は
-- 全ロール（employee を含む）に対して登録する（PRD 7節）。
--
-- service_category は新規「タスク管理」を作成する。既存カテゴリに適切な単一分類が無いため、
-- 一般ユーザー向けの汎用機能が属する「便利ツール」service_class（sort_order=80）の配下に
-- 位置づける（他のクラスは勤怠・採用・ウエルビーイング等ドメイン固有で該当しないための判断）。

DO $$
DECLARE
  v_class_id uuid;
  v_category_id uuid;
  v_service_id uuid;
BEGIN
  -- service_class「便利ツール」を名前で解決する（既存のはず。無ければ何もしない＝紐付けをスキップ）
  SELECT id INTO v_class_id FROM public.service_class WHERE name = '便利ツール' LIMIT 1;

  -- service_category「タスク管理」を名前で解決（無ければ作成、冪等）
  SELECT id INTO v_category_id FROM public.service_category WHERE name = 'タスク管理' LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO public.service_category (id, sort_order, name)
    VALUES (gen_random_uuid(), 820, 'タスク管理')
    RETURNING id INTO v_category_id;
  END IF;

  -- service_class_index への紐付け（無ければ作成、冪等）
  IF v_class_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_class_index
    WHERE service_class_id = v_class_id AND service_category_id = v_category_id
  ) THEN
    INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
    VALUES (gen_random_uuid(), v_class_id, v_category_id);
  END IF;

  -- service行（route_pathで重複防止、冪等）
  IF NOT EXISTS (SELECT 1 FROM public.service WHERE trim(route_path) = '/tasks') THEN
    INSERT INTO public.service
      (service_category_id, name, category, title, description, sort_order, route_path, target_audience, release_status)
    VALUES (
      v_category_id, 'タスク管理', '', 'タスク管理',
      '自分が関与する目標・マイルストーン・タスクグループの一覧確認、タスクの進捗更新ができます。',
      10, '/tasks', 'all_users', '公開'
    )
    RETURNING id INTO v_service_id;
  ELSE
    SELECT id INTO v_service_id FROM public.service WHERE trim(route_path) = '/tasks';
  END IF;

  -- app_role_service：全ロールに対して許可する（employee を含む。PRD 7節）
  INSERT INTO public.app_role_service (id, app_role_id, service_id)
  SELECT gen_random_uuid(), ar.id, v_service_id
  FROM public.app_role ar
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_role_service ars
    WHERE ars.app_role_id = ar.id AND ars.service_id = v_service_id
  );

  -- tenant_service：既存の全契約テナントに対して機能を有効化する
  INSERT INTO public.tenant_service (tenant_id, service_id)
  SELECT t.id, v_service_id
  FROM public.tenants t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_service ts
    WHERE ts.tenant_id = t.id AND ts.service_id = v_service_id
  );
END $$;
