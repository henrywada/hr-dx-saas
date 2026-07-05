-- =============================================================================
-- Migration: learning_progress（eラーニング進捗）+ RLS 一式  [v2: パターンB対応版]
-- Target   : Supabase (Postgres 15+) — hr-dx-saas 既存スキーマに準拠
--
-- v2での変更点（v1からの差分）:
--   1. current_tenant_id() / current_employee_id() の新規定義を削除
--      → 既存関数（employees.user_id = auth.uid() 参照）をそのまま利用する。
--        本マイグレーションは「関数を作らず、使うだけ」。
--   2. is_tenant_admin() を削除。既存の current_employee_app_role() を使い、
--      app_role IN ('hr','hr_manager','developer') で管理者判定する。
--      （employees に role 列は存在しない。app_role_id → app_role テーブル経由）
--   3. 複合FK（employees(id, tenant_id)への参照）と、そのための一意制約前提を撤回。
--      employees.id は auth.users.id と無関係な独立UUIDであり、当該制約は
--      現行スキーマに存在しない。代わりに、insert/update の with check で
--      tenant_id = current_tenant_id() と employee_id = current_employee_id() を
--      両方要求する。両者は同一の employees 行（user_id = auth.uid()）から
--      導出されるため、tenant_id と employee_id の不整合は構造的に発生しない
--      （追加の制約なしで安全）。
--   4. 命名規則を既存の新しめのテーブル群（announcements 等）に統一。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. 前提（PREREQUISITES） — 追加のスキーマ変更は不要
-- -----------------------------------------------------------------------------
-- 既存の以下の関数・テーブルが存在することを前提にする（新規作成しない）:
--   - public.current_tenant_id()         : employees.user_id=auth.uid() → tenant_id
--   - public.current_employee_id()       : employees.user_id=auth.uid() → id
--   - public.current_employee_app_role() : employees → app_role.app_role
--   - public.tenants(id)
--   - public.employees(id, tenant_id, user_id, app_role_id, ...)
--   - public.app_role(id, app_role)  ※値の例: hr, hr_manager, developer, employee 等


-- -----------------------------------------------------------------------------
-- 1. updated_at 自動更新（既存に同名トリガー関数があれば本節は不要。要確認）
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. learning_modules（教材マスタ：全テナント共通配布のためtenant_idを持たない）
-- -----------------------------------------------------------------------------
create table if not exists public.learning_modules (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,                 -- 例: 'power-harassment'
  title         text not null,
  display_order integer not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_learning_modules_updated_at
before update on public.learning_modules
for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. learning_progress（進捗：employee × module につき 1 行）
-- -----------------------------------------------------------------------------
create table if not exists public.learning_progress (
  id            uuid primary key default gen_random_uuid(),

  tenant_id     uuid not null references public.tenants(id)          on delete cascade,
  employee_id   uuid not null references public.employees(id)        on delete cascade,
  module_id     uuid not null references public.learning_modules(id) on delete cascade,

  status        text    not null default 'not_started'
                  check (status in ('not_started', 'in_progress', 'completed')),
  last_position integer not null default 0   check (last_position >= 0),
  progress_pct  numeric(5,2) not null default 0 check (progress_pct between 0 and 100),
  score         numeric(5,2)             check (score between 0 and 100),
  attempts      integer not null default 0   check (attempts >= 0),

  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint learning_progress_employee_module_key unique (employee_id, module_id)

  -- ※ v1にあった複合FK制約は削除（0.前提の一意制約が現行スキーマに無いため）。
  --   代わりに 5-2 の insert/update ポリシーで tenant_id と employee_id の
  --   整合を強制する（両者とも current_*_id() = 同一 employees 行から導出）。
);

create index if not exists idx_learning_progress_tenant
  on public.learning_progress (tenant_id);
create index if not exists idx_learning_progress_tenant_module
  on public.learning_progress (tenant_id, module_id);
create index if not exists idx_learning_progress_tenant_status
  on public.learning_progress (tenant_id, status);

create trigger trg_learning_progress_updated_at
before update on public.learning_progress
for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 4. learning_preferences（音声/字幕プリファレンス：employee ごと 1 行）
--    既定: audio_enabled=false（無音でも成立を既定に） / captions_enabled=true
-- -----------------------------------------------------------------------------
create table if not exists public.learning_preferences (
  employee_id      uuid primary key references public.employees(id) on delete cascade,
  tenant_id        uuid not null    references public.tenants(id)   on delete cascade,
  audio_enabled    boolean not null default false,
  captions_enabled boolean not null default true,
  updated_at       timestamptz not null default now()
);

create trigger trg_learning_preferences_updated_at
before update on public.learning_preferences
for each row execute function public.set_updated_at();


-- =============================================================================
-- 5. RLS（既存の current_tenant_id() / current_employee_id() /
--        current_employee_app_role() を利用。新規ヘルパーは作らない）
-- =============================================================================

-- 5-1. learning_modules : 公開教材は全 authenticated が閲覧可
alter table public.learning_modules enable row level security;

create policy "learning_modules_select_published"
on public.learning_modules
for select
to authenticated
using ( is_published = true );


-- 5-2. learning_progress
alter table public.learning_progress enable row level security;

-- SELECT: 自テナント内で「本人の行」または「管理者ロール(hr/hr_manager/developer)は全員」
create policy "learning_progress_select_own_or_admin"
on public.learning_progress
for select
to authenticated
using (
  tenant_id = current_tenant_id()
  and (
        employee_id = current_employee_id()
     or current_employee_app_role() in ('hr', 'hr_manager', 'developer')
  )
);

-- INSERT: 本人が自分の行だけ作成可
-- （tenant_id・employee_id ともに同一 employees 行から導出されるため、
--   この2条件を満たせば両者の整合は自動的に保証される）
create policy "learning_progress_insert_own"
on public.learning_progress
for insert
to authenticated
with check (
  tenant_id   = current_tenant_id()
  and employee_id = current_employee_id()
);

-- UPDATE: 本人が自分の行だけ更新可（管理者は閲覧のみ＝更新不可）
create policy "learning_progress_update_own"
on public.learning_progress
for update
to authenticated
using (
  tenant_id   = current_tenant_id()
  and employee_id = current_employee_id()
)
with check (
  tenant_id   = current_tenant_id()
  and employee_id = current_employee_id()
);

-- DELETE: ポリシー無し = authenticated からは削除不可。
--         退職者処理・データ保持は service_role 側のオペレーションで実施。


-- 5-3. learning_preferences : 本人のみ read/write
alter table public.learning_preferences enable row level security;

create policy "learning_preferences_select_own"
on public.learning_preferences
for select
to authenticated
using (
  tenant_id   = current_tenant_id()
  and employee_id = current_employee_id()
);

create policy "learning_preferences_insert_own"
on public.learning_preferences
for insert
to authenticated
with check (
  tenant_id   = current_tenant_id()
  and employee_id = current_employee_id()
);

create policy "learning_preferences_update_own"
on public.learning_preferences
for update
to authenticated
using (
  tenant_id   = current_tenant_id()
  and employee_id = current_employee_id()
)
with check (
  tenant_id   = current_tenant_id()
  and employee_id = current_employee_id()
);


-- =============================================================================
-- 6. 動作確認（VERIFICATION）※ローカルpsqlから。実ユーザーで比較検証。
-- =============================================================================
-- 前提: 既存の認証フローは employees.user_id = auth.uid() で解決するため、
-- JWTクレーム偽装ではなく「実在する複数テナントのテストユーザー」で
-- ログインして比較するのが最も確実（クレーム注入の仕組みが無いため）。
--
-- 確認項目:
--   - テナントAのユーザーで select すると、テナントBの learning_progress が
--     0件であること（越境不可）
--   - app_role = 'employee' のユーザーは自分の行のみ select 可能
--   - app_role = 'hr' / 'hr_manager' / 'developer' のユーザーは自テナント内の
--     他人の行も select 可能
--   - 本人以外の employee_id で insert/update すると with check により拒否される
--   - authenticated ロールから delete が拒否される（ポリシー未定義のため）
