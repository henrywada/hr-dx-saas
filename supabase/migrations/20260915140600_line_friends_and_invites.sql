-- =============================================================================
-- LINE友だち紐付け・招待トークン
--
-- line_friends  : LINE公式アカウントの友だちと従業員の紐付け（全テナント共用OA）
-- line_friend_invites : 既存従業員向け LINE 友だち招待トークン
--
-- RLS:
--   SELECT のみ authenticated に許可（line_friends）
--   管理者（app_role <> 'employee'）が CRUD 可（line_friend_invites）
--   書込は Server Actions / Webhook の service_role 経由を想定
-- =============================================================================

-- moddatetime 拡張（updated_at 自動更新に使用。未インストール環境でも安全）
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- =============================================================================
-- 1. line_friends
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.line_friends (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id  text NOT NULL UNIQUE,
  tenant_id     uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id   uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  status        text NOT NULL DEFAULT 'unlinked'
                CHECK (status IN ('unlinked', 'linked', 'blocked')),
  linked_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 紐付き従業員はテナント内で1人のみ（部分インデックス）
CREATE UNIQUE INDEX IF NOT EXISTS line_friends_linked_employee_idx
  ON public.line_friends (employee_id)
  WHERE status = 'linked' AND employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS line_friends_tenant_idx ON public.line_friends (tenant_id);
CREATE INDEX IF NOT EXISTS line_friends_user_idx   ON public.line_friends (user_id);

ALTER TABLE public.line_friends ENABLE ROW LEVEL SECURITY;

-- 閲覧: 自テナント or SaaS管理者
CREATE POLICY line_friends_select ON public.line_friends
  FOR SELECT TO authenticated
  USING (
    public.current_employee_app_role() = 'developer'
    OR tenant_id = public.current_tenant_id()
  );

GRANT SELECT ON public.line_friends TO authenticated;

-- updated_at 自動更新トリガ（moddatetime 拡張を使用）
DROP TRIGGER IF EXISTS set_line_friends_updated_at ON public.line_friends;
CREATE TRIGGER set_line_friends_updated_at
  BEFORE UPDATE ON public.line_friends
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

COMMENT ON TABLE public.line_friends IS 'LINE公式アカウントの友だちと従業員の紐付け（全テナント共用OA）';

-- =============================================================================
-- 2. line_friend_invites
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.line_friend_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id  uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  invite_token text NOT NULL UNIQUE,
  created_by   uuid NOT NULL REFERENCES auth.users(id),
  expires_at   timestamptz NOT NULL,
  used_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS line_friend_invites_tenant_idx
  ON public.line_friend_invites (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS line_friend_invites_token_idx
  ON public.line_friend_invites (invite_token);

ALTER TABLE public.line_friend_invites ENABLE ROW LEVEL SECURITY;

-- 管理者（app_role <> 'employee'）が CRUD 可、SaaS管理者は全件アクセス可
CREATE POLICY line_friend_invites_admin ON public.line_friend_invites
  FOR ALL TO authenticated
  USING (
    public.current_employee_app_role() = 'developer'
    OR (
      tenant_id = public.current_tenant_id()
      AND public.current_employee_app_role() <> 'employee'
    )
  )
  WITH CHECK (
    public.current_employee_app_role() = 'developer'
    OR (
      tenant_id = public.current_tenant_id()
      AND public.current_employee_app_role() <> 'employee'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_friend_invites TO authenticated;

COMMENT ON TABLE public.line_friend_invites IS '既存従業員向け LINE 友だち招待トークン';

-- =============================================================================
-- サービスマスタ登録（サイドメニューへの表示）
--   テナント管理者側: /adm/settings と同じカテゴリに並べる。
--                     tenant_service は /adm/settings が割当済みのテナントへコピー。
--   SaaS管理者側:     /saas_adm/hr-law-knowledge と同じカテゴリに並べる。
--
-- ⚠ UUID を環境間で固定するため、カテゴリは route_path で解決する。
--   解決できない環境ではメニュー登録をスキップし WARNING で通知。
-- =============================================================================

DO $$
DECLARE
  -- 本機能で新設するサービスの id（環境間で揃える）
  v_adm_service_id  CONSTANT uuid := 'a1c8e4d2-6b70-4f3a-9e21-5d84c0b17a52';
  v_saas_service_id CONSTANT uuid := 'c3f0b9a7-2e15-4d88-b6c4-91a07e3d5f80';

  v_adm_category_id    uuid;
  v_saas_category_id   uuid;
  v_sibling_service_id uuid;
  v_assigned_count     integer;
BEGIN
  -- ---- テナント管理者向けカテゴリと兄弟サービスを解決 ----
  SELECT s.service_category_id, s.id
    INTO v_adm_category_id, v_sibling_service_id
  FROM public.service s
  WHERE trim(s.route_path) = '/adm/settings'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  -- ---- SaaS管理者向けカテゴリを解決 ----
  SELECT s.service_category_id
    INTO v_saas_category_id
  FROM public.service s
  WHERE trim(s.route_path) = '/saas_adm/hr-law-knowledge'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  -- ---- テナント管理者向けサービスを登録 ----
  IF v_adm_category_id IS NULL THEN
    RAISE WARNING '[line_friends] テナント管理者向けカテゴリを解決できませんでした。'
      '/adm/line-friend-invites のメニュー登録をスキップします（/saas_adm から手動登録してください）。';
  ELSE
    INSERT INTO public.service (
      id, service_category_id, name, category, title, description,
      sort_order, route_path, app_role_group_id, app_role_group_uuid,
      target_audience, release_status
    ) VALUES (
      v_adm_service_id,
      v_adm_category_id,
      'LINE友だち招待',
      NULL,
      '従業員へ LINE 友だち追加の招待リンクを発行',
      '人事担当者が従業員ごとに招待トークンを発行し、LINE公式アカウントへの友だち追加を促します。招待状況や紐付け済み従業員の一覧を管理できます。',
      50,
      '/adm/line-friend-invites',
      NULL,
      NULL,
      'adm',
      '公開'
    )
    ON CONFLICT (id) DO NOTHING;

    -- tenant_service: /adm/settings が割当済みのテナントへコピー
    IF v_sibling_service_id IS NULL THEN
      RAISE WARNING '[line_friends] 割当元サービス(/adm/settings)が無いため '
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
      RAISE NOTICE '[line_friends] tenant_service へ % 件のテナントを割り当てました。', v_assigned_count;
    END IF;
  END IF;

  -- ---- SaaS管理者向けサービスを登録 ----
  IF v_saas_category_id IS NULL THEN
    RAISE WARNING '[line_friends] SaaS管理者向けカテゴリを解決できませんでした。'
      '/saas_adm/line のメニュー登録をスキップします（手動登録してください）。';
  ELSE
    INSERT INTO public.service (
      id, service_category_id, name, category, title, description,
      sort_order, route_path, app_role_group_id, app_role_group_uuid,
      target_audience, release_status
    ) VALUES (
      v_saas_service_id,
      v_saas_category_id,
      'LINE連携管理',
      NULL,
      'LINE公式アカウント連携の設定とテナント別紐付け状況',
      'LINE公式アカウントのWebhook設定、チャネルアクセストークン管理、および全テナントの LINE 友だち紐付け状況をSaaS管理者として確認・操作します。',
      30,
      '/saas_adm/line',
      NULL,
      NULL,
      'saas_adm',
      '公開'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
