-- =============================================================================
-- 助成金情報配信（grant notifier）
--
-- J-グランツAPI等から助成金情報を収集し、テナントの配信条件と AI でマッチングして
-- 週次でメール配信する機能。dx-toolbox の grant_notifier スキーマを
-- hr-dx-saas の public スキーマ（grant_ 接頭辞）へ移植したもの。
--
-- テーブル区分:
--   1. 横断マスタ（tenant_id なし）  : grant_sources / grants / grant_versions
--   2. テナント固有（tenant_id + RLS）: grant_tenant_conditions / grant_match_results
--                                       / grant_deliveries / grant_application_status
--   3. 運用監視（SaaS管理者のみ閲覧） : grant_batch_runs / grant_llm_usage
-- =============================================================================


-- =============================================================================
-- 1. 横断マスタ
--    収集はテナント横断で1回のみ実施するため tenant_id を持たない。
--    書込は collect バッチ（service_role）のみ。authenticated 向けの書込ポリシーは
--    敢えて定義せず、一律拒否する（hr_law_sources と同じ設計）。
-- =============================================================================

-- ---- 収集ソースマスタ ----
CREATE TABLE public.grant_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  source_type     text NOT NULL CHECK (source_type IN ('jgrants_api', 'crawl')),
  url             text NOT NULL UNIQUE,
  -- クロール対象の HTML 構造変更検知用。API ソースは NULL。
  structure_hash  text,
  last_fetched_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grant_sources IS '助成金の収集ソースマスタ（全テナント共有。収集は横断で1回のみ実施するため tenant_id を持たない）';

-- ---- 助成金マスタ ----
CREATE TABLE public.grants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id           uuid NOT NULL REFERENCES public.grant_sources(id) ON DELETE RESTRICT,
  -- J-グランツの subsidy id 等、ソース側の一意ID
  external_id         text,
  -- 出典URL + タイトル正規化のハッシュ。重複排除の安定キー
  normalized_key      text NOT NULL UNIQUE,
  title               text NOT NULL,
  -- 発行主体（国／都道府県／市区町村）
  issuer              text,
  -- 地域コード（JIS X 0401/0402）。将来の地域拡張用
  region_code         text,
  -- 生の対象地域文字列（例:「全国」「東京都」）
  target_area         text,
  summary             text,
  -- 本文（HTML からテキスト抽出済み）
  detail_text         text,
  -- 本文ハッシュ（更新検知用）
  body_hash           text NOT NULL,
  max_amount          bigint,
  subsidy_rate        text,
  industry            text,
  target_employees    text,
  acceptance_start_at timestamptz,
  -- 申請締切。週次配信のフィルタ・締切順ソートに使用
  acceptance_end_at   timestamptz,
  external_url        text,
  fetched_at          timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grants IS '助成金マスタ（全テナント共有。テナント別の適合判定は grant_match_results で表す）';

CREATE INDEX grants_acceptance_end_idx ON public.grants(acceptance_end_at);
CREATE INDEX grants_source_idx ON public.grants(source_id);

-- ---- 更新履歴 ----
CREATE TABLE public.grant_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id       uuid NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  -- そのバージョン時点の本文ハッシュ
  body_hash      text NOT NULL,
  -- 変更点の要約（AI生成）。初回や要約失敗時は NULL
  change_summary text,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grant_versions IS '助成金マスタ（横断）の変更記録。tenant_id を持たない理由も同じ';

CREATE INDEX grant_versions_grant_idx ON public.grant_versions(grant_id);


-- =============================================================================
-- 2. テナント固有（tenant_id NOT NULL + RLS 必須）
-- =============================================================================

-- ---- 配信条件（テナントにつき1件） ----
CREATE TABLE public.grant_tenant_conditions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- 業種（日本標準産業分類）複数可
  industries         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 従業員数（中小企業要件の判定に使用）
  employee_count     integer,
  capital            bigint,
  -- 所在地（都道府県名）複数可
  prefectures        jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 関心カテゴリ（雇用／育成／設備投資 等）
  categories         jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords           text,
  -- 通知先メール（複数可）
  notify_emails      jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_frequency text NOT NULL DEFAULT 'weekly'
                     CHECK (delivery_frequency IN ('weekly', 'monthly')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

COMMENT ON TABLE public.grant_tenant_conditions IS '助成金情報配信のテナント別配信条件（テナントにつき1件）';

CREATE INDEX grant_tenant_conditions_tenant_idx ON public.grant_tenant_conditions(tenant_id);

-- ---- AI適合判定（テナント×助成金で最新1件。不適合も含め全件保存） ----
CREATE TABLE public.grant_match_results (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  grant_id           uuid NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  verdict            text NOT NULL CHECK (verdict IN ('適合', '要確認', '不適合')),
  -- 0.000–1.000。閾値未満の「適合」は「要確認」へ降格して保存する
  confidence         numeric(4, 3) NOT NULL,
  reasons            jsonb NOT NULL DEFAULT '[]'::jsonb,
  matched_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  unclear_points     jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 判定に使用したモデル
  model              text NOT NULL,
  evaluated_at       timestamptz NOT NULL DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, grant_id)
);

COMMENT ON TABLE public.grant_match_results IS 'テナント条件×助成金の AI 適合判定。不適合を含め全件保存する';

CREATE INDEX grant_match_results_tenant_idx ON public.grant_match_results(tenant_id);
CREATE INDEX grant_match_results_grant_idx ON public.grant_match_results(grant_id);
CREATE INDEX grant_match_results_verdict_idx ON public.grant_match_results(tenant_id, verdict);

-- ---- 配信履歴 ----
CREATE TABLE public.grant_deliveries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  grant_id         uuid NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  -- 更新再通知用（現状は新着のみのため NULL）。後続で grant_versions と紐付ける
  grant_version_id uuid REFERENCES public.grant_versions(id) ON DELETE SET NULL,
  -- 同報した通知先メール数
  recipient_count  integer NOT NULL DEFAULT 0,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, grant_id)
);

COMMENT ON TABLE public.grant_deliveries IS '助成金情報の配信履歴。(tenant_id, grant_id) で送信済みを一意管理し重複送信を防ぐ';

CREATE INDEX grant_deliveries_tenant_idx ON public.grant_deliveries(tenant_id);
CREATE INDEX grant_deliveries_sent_idx ON public.grant_deliveries(tenant_id, sent_at DESC);

-- ---- 申請ステータス ----
CREATE TABLE public.grant_application_status (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  grant_id   uuid NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT '検討中'
             CHECK (status IN ('検討中', '申請準備', '申請済み', '見送り')),
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, grant_id)
);

COMMENT ON TABLE public.grant_application_status IS '助成金の申請進捗管理（テナント固有）';

CREATE INDEX grant_application_status_tenant_idx ON public.grant_application_status(tenant_id);


-- =============================================================================
-- 3. 運用監視（SaaS管理者のみ閲覧。書込は service_role＝バッチのみ）
-- =============================================================================

CREATE TABLE public.grant_batch_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step            text NOT NULL CHECK (step IN ('collect', 'match', 'deliver')),
  status          text NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'success', 'failed')),
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  processed_count integer NOT NULL DEFAULT 0,
  error_message   text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grant_batch_runs IS '助成金情報配信バッチの実行履歴。テナント横断で動く処理を含むため tenant_id を持たず、内訳は metadata に記録する';

CREATE INDEX grant_batch_runs_step_idx ON public.grant_batch_runs(step);
CREATE INDEX grant_batch_runs_started_idx ON public.grant_batch_runs(started_at DESC);

CREATE TABLE public.grant_llm_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- collect の更新要約生成はテナント非依存（横断マスタ更新）のため NULL。
  -- テナント別のマッチングでは必ず記録し、テナント別コスト集計に用いる。
  tenant_id     uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  step          text NOT NULL CHECK (step IN ('collect', 'match', 'deliver')),
  model         text NOT NULL,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd      numeric(12, 6) NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.grant_llm_usage IS '助成金情報配信バッチの LLM 利用量・コスト';

CREATE INDEX grant_llm_usage_tenant_idx ON public.grant_llm_usage(tenant_id);
CREATE INDEX grant_llm_usage_created_idx ON public.grant_llm_usage(created_at DESC);


-- =============================================================================
-- updated_at 自動更新トリガ
-- =============================================================================

CREATE OR REPLACE FUNCTION public.grant_notifier_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER grant_sources_touch_updated_at
  BEFORE UPDATE ON public.grant_sources
  FOR EACH ROW EXECUTE FUNCTION public.grant_notifier_touch_updated_at();

CREATE TRIGGER grants_touch_updated_at
  BEFORE UPDATE ON public.grants
  FOR EACH ROW EXECUTE FUNCTION public.grant_notifier_touch_updated_at();

CREATE TRIGGER grant_tenant_conditions_touch_updated_at
  BEFORE UPDATE ON public.grant_tenant_conditions
  FOR EACH ROW EXECUTE FUNCTION public.grant_notifier_touch_updated_at();

CREATE TRIGGER grant_application_status_touch_updated_at
  BEFORE UPDATE ON public.grant_application_status
  FOR EACH ROW EXECUTE FUNCTION public.grant_notifier_touch_updated_at();


-- =============================================================================
-- RLS
--   テナント判定は public.current_tenant_id()、
--   SaaS管理者判定は public.current_employee_app_role() = 'developer' を使う。
--   書込ポリシーを定義していないテーブルは authenticated からの書込を一律拒否し、
--   バッチの service_role（createAdminClient）のみが書き込める。
-- =============================================================================

ALTER TABLE public.grant_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_tenant_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_application_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_batch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_llm_usage ENABLE ROW LEVEL SECURITY;

-- ---- 横断マスタ: 表示用 SELECT のみ ----
CREATE POLICY "grant_sources_select" ON public.grant_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "grants_select" ON public.grants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "grant_versions_select" ON public.grant_versions
  FOR SELECT TO authenticated USING (true);

-- ---- 配信条件: 閲覧は自テナント、編集はテナント管理者（app_role <> 'employee'） ----
CREATE POLICY "grant_tenant_conditions_select" ON public.grant_tenant_conditions
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR public.current_employee_app_role() = 'developer'
  );

CREATE POLICY "grant_tenant_conditions_insert" ON public.grant_tenant_conditions
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
  );

CREATE POLICY "grant_tenant_conditions_update" ON public.grant_tenant_conditions
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
  );

CREATE POLICY "grant_tenant_conditions_delete" ON public.grant_tenant_conditions
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_employee_app_role() IS DISTINCT FROM 'employee'
  );

-- ---- 判定結果・配信履歴: 閲覧のみ（書込は match/deliver バッチ） ----
CREATE POLICY "grant_match_results_select" ON public.grant_match_results
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR public.current_employee_app_role() = 'developer'
  );

CREATE POLICY "grant_deliveries_select" ON public.grant_deliveries
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR public.current_employee_app_role() = 'developer'
  );

-- ---- 申請ステータス: 自テナントのメンバーが CRUD 可（進捗管理は従業員も行う想定） ----
CREATE POLICY "grant_application_status_select" ON public.grant_application_status
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    OR public.current_employee_app_role() = 'developer'
  );

CREATE POLICY "grant_application_status_insert" ON public.grant_application_status
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "grant_application_status_update" ON public.grant_application_status
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "grant_application_status_delete" ON public.grant_application_status
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id());

-- ---- 運用監視: SaaS管理者のみ閲覧 ----
CREATE POLICY "grant_batch_runs_select" ON public.grant_batch_runs
  FOR SELECT TO authenticated
  USING (public.current_employee_app_role() = 'developer');

CREATE POLICY "grant_llm_usage_select" ON public.grant_llm_usage
  FOR SELECT TO authenticated
  USING (public.current_employee_app_role() = 'developer');

-- =============================================================================
-- サービスマスタ登録（サイドメニューへの表示）
--   テナント管理者側: 既存の「自動検索・配信ルール設定」（/adm/auto-distribution）と
--                     同じカテゴリ（便利ツール／ツールボックス）に並べる。
--                     tenant_service の割当が無いとメニューに出ないため、同サービスと
--                     同じテナントへ割り当てる。
--   SaaS管理者側:     既存の「人事法令アップデート管理」（/saas_adm/hr-law-knowledge）と
--                     同じカテゴリ（SaaS管理メニュー／SaaS：その他）に並べる。
--                     AppSidebar は target_audience と release_status のみで絞るため
--                     tenant_service / app_role_service への割当は不要。
--
-- ⚠ service / service_category / tenant_service はクラウドDBと同期しているマスタで、
--   同じカテゴリでも環境ごとに id が異なる。そのため UUID をハードコードせず、
--   既存サービスの route_path を手がかりにカテゴリを解決する。
--   解決できない環境では登録をスキップし、WARNING で運用者に知らせる
--   （テーブル本体の作成は成功させ、メニュー登録だけ手動対応に委ねる）。
--
-- app_role_service には登録しない（登録が無い＝役割による制限なし＝
-- テナント管理者の全役割で表示される。AppSidebar の実装に準拠）。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するサービスの id（環境間で揃える）
  v_adm_service_id  CONSTANT uuid := '5f1e2c60-8a44-4d1e-9c3b-7e0a6d21b4f1';
  v_saas_service_id CONSTANT uuid := 'b7d3a95e-1c62-4f80-a5d7-2e94f6c08a33';

  v_adm_category_id  uuid;
  v_saas_category_id uuid;
  v_sibling_service_id uuid;
  v_assigned_count integer;
BEGIN
  -- ---- テナント管理者向けのカテゴリと、割当元になる兄弟サービスを解決する ----
  SELECT s.service_category_id, s.id
    INTO v_adm_category_id, v_sibling_service_id
  FROM public.service s
  WHERE s.route_path = '/adm/auto-distribution'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  -- 兄弟サービスが見つからない環境では、カテゴリ名で解決を試みる
  IF v_adm_category_id IS NULL THEN
    SELECT c.id INTO v_adm_category_id
    FROM public.service_category c
    WHERE c.name = 'ツールボックス'
    ORDER BY c.sort_order DESC
    LIMIT 1;
  END IF;

  -- ---- SaaS管理者向けのカテゴリを解決する ----
  SELECT s.service_category_id INTO v_saas_category_id
  FROM public.service s
  WHERE s.route_path = '/saas_adm/hr-law-knowledge'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  IF v_saas_category_id IS NULL THEN
    SELECT c.id INTO v_saas_category_id
    FROM public.service_category c
    WHERE c.name = 'SaaS：その他'
    LIMIT 1;
  END IF;

  -- ---- テナント管理者向けサービスを登録 ----
  IF v_adm_category_id IS NULL THEN
    RAISE WARNING '[grant_notifier] テナント管理者向けカテゴリを解決できませんでした。'
      '/adm/grant-notifier のメニュー登録をスキップします（/saas_adm から手動登録してください）。';
  ELSE
    INSERT INTO public.service (
      id, service_category_id, name, category, title, description,
      sort_order, route_path, app_role_group_id, app_role_group_uuid,
      target_audience, release_status
    ) VALUES (
      v_adm_service_id,
      v_adm_category_id,
      '助成金情報配信',
      NULL,
      '自社に合う助成金を AI が毎週チェックしてメール配信',
      '業種・所在地・従業員数などの条件を登録すると、J-グランツ等から収集した新着・更新の助成金を AI が適合判定し、週次または月次でメール配信します。過去の配信内容と判定理由は配信アーカイブから確認できます。',
      40,
      '/adm/grant-notifier',
      NULL,
      NULL,
      'adm',
      '公開'
    )
    ON CONFLICT (id) DO NOTHING;

    -- テナント割当: 兄弟サービスと同じテナントで利用可能にする
    IF v_sibling_service_id IS NULL THEN
      RAISE WARNING '[grant_notifier] 割当元サービス(/adm/auto-distribution)が無いため '
        'tenant_service への割当をスキップしました。契約テナントへ手動で割り当ててください。';
    ELSE
      INSERT INTO public.tenant_service (tenant_id, service_id, start_date, status)
      SELECT ts.tenant_id, v_adm_service_id, ts.start_date, ts.status
      FROM public.tenant_service ts
      WHERE ts.service_id = v_sibling_service_id
        AND NOT EXISTS (
          SELECT 1 FROM public.tenant_service dup
          WHERE dup.tenant_id = ts.tenant_id
            AND dup.service_id = v_adm_service_id
        );
      GET DIAGNOSTICS v_assigned_count = ROW_COUNT;
      RAISE NOTICE '[grant_notifier] tenant_service へ % 件のテナントを割り当てました。', v_assigned_count;
    END IF;
  END IF;

  -- ---- SaaS管理者向けサービス（バッチ運用監視）を登録 ----
  IF v_saas_category_id IS NULL THEN
    RAISE WARNING '[grant_notifier] SaaS管理者向けカテゴリを解決できませんでした。'
      '/saas_adm/grant-notifier のメニュー登録をスキップします（手動登録してください）。';
  ELSE
    INSERT INTO public.service (
      id, service_category_id, name, category, title, description,
      sort_order, route_path, app_role_group_id, app_role_group_uuid,
      target_audience, release_status
    ) VALUES (
      v_saas_service_id,
      v_saas_category_id,
      '助成金情報配信 バッチ管理',
      NULL,
      '収集・マッチング・配信バッチの稼働状況と手動再実行',
      '助成金情報配信の collect / match / deliver バッチの実行履歴、AI 利用コスト、収集ソースの稼働状況を横断で確認し、必要に応じて手動再実行します。',
      20,
      '/saas_adm/grant-notifier',
      NULL,
      NULL,
      'saas_adm',
      '公開'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
