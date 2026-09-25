# SaaS管理者向けログイン履歴（全テナント）＋古いログ削除 実装計画

**ブランチ:** feature/saas-login-logs（main から分岐）
**Spec:** 会話で確定済み（下記「Global Constraints」が仕様）。参照実装はテナント管理者版（commit 7101a0f）。

## Global Constraints

- 言語: コメント・UI 文言は日本語。日時は `Asia/Tokyo`。コード識別子は英語。
- ルートは実在ディレクトリの `saas_adm`（アンダースコア）。画面は `src/app/(saas-admin)/saas_adm/login-logs/`。URL は `APP_ROUTES.SAAS.LOGIN_LOGS = '/saas_adm/login-logs'`。
- SELECT は `src/features/login-logs/queries.ts`、書き込みは同 `actions.ts`（Server Action）。`page.tsx` に `supabase.from(...)` を直接書かない。`createAdminClient()` は使わない。
- アクセス権: SaaS管理者のみ（`user.role === 'supaUser' || user.appRole === 'developer'`）。ページ・Server Action・DB 関数の3層で確認する。DB 側は `public.current_employee_app_role() = 'developer'` または `auth.jwt()->'user_metadata'->>'role' = 'supaUser'`。
- 表示列: 日時 / ユーザー名 / メールアドレス / テナント名（全列ソート可能）。ユーザー名が NULL（employees 行なし）は `---` 表示。
- フィルタ: 年月（先頭「全て」、過去24ヶ月、`?ym=YYYY-MM`）とテナント（先頭「全て」、`?tenant=<uuid>`）。片方を変えてももう片方を保持する。不正な値は null（=全て）として扱う。
- 「全て」表示の件数上限は 5,000 件（新しい順）。上限に達した場合は画面に「新しい 5,000 件のみ表示」と明示する。定数名 `LOGIN_LOG_MAX_ROWS`。
- テナント名は `COALESCE(t.name, t.company_name)`（`tenants` に両カラムあり）。
- 削除機能の仕様:
  - 対象は `access_logs` の `action = 'LOGIN_SUCCESS'` の行のみ。
  - 「指定年月の1日 0:00（JST）より**前**」を全テナント分削除する（指定月は残る）。
  - 指定可能なのは当月より前のみ。当月・未来月・不正形式は DB 関数と Server Action の両方で拒否する。
  - 削除前に件数プレビュー必須。確認ダイアログで対象年月の手入力一致が必要。
  - 削除の記録として `access_logs` に `action='LOGIN_LOGS_PURGED'`, `path='/saas_adm/login-logs'`, `method='POST'`, `user_id=auth.uid()`, `tenant_id=NULL`, `details={"before_year_month","deleted_count"}` を1行挿入する（同一関数内・同一トランザクション）。
- DB 安全: `supabase db reset` 禁止。マイグレーションは `CREATE OR REPLACE` / `IF NOT EXISTS`。関数は `SECURITY DEFINER`, `SET search_path = public, auth`, `REVOKE ALL ... FROM PUBLIC`, `GRANT EXECUTE ... TO authenticated`。ローカル DB（127.0.0.1:55422）以外に対して適用・削除を実行しない。クラウド DB への push はしない。
- テスト: Node 組み込みランナー（`npm test` = `node --import tsx --test "src/**/*.test.ts"`）。純粋関数は Unit テストを書く。
- 検証コマンド: `npm run type-check`、`npm run lint`。
- デザイン: `docs/ui/admin-card-and-table.md` と HR-DX Design System（Noto Sans JP、primary #FD7601、ボーダー #e2e6ec、card 角丸 12px、input/button 8px）。危険操作は赤系。

## Task 1: DB マイグレーション（一覧・件数・削除関数）

**Files:** Create `supabase/migrations/20260925090000_add_saas_login_log_functions.sql`

3関数を1ファイルに作る。すべて共通のガード条件（Global Constraints）を先頭で評価する。

1. `public.get_all_tenant_login_logs(p_year_month text DEFAULT NULL, p_tenant_id uuid DEFAULT NULL, p_limit int DEFAULT 5000)`
   - RETURNS TABLE(id uuid, logged_in_at timestamptz, employee_name text, email text, tenant_id uuid, tenant_name text)
   - `access_logs al` を `action='LOGIN_SUCCESS'` で絞り、`LEFT JOIN employees e ON e.user_id = al.user_id`、`JOIN auth.users u ON u.id = al.user_id`、`LEFT JOIN tenants t ON t.id = al.tenant_id`。
   - 年月は `to_char(al.created_at AT TIME ZONE 'Asia/Tokyo','YYYY-MM') = p_year_month`。テナントは `p_tenant_id IS NULL OR al.tenant_id = p_tenant_id`。`ORDER BY al.created_at DESC LIMIT p_limit`。
   - ガード不成立時は空を返す（`WHERE` に条件を含める）。
2. `public.count_login_logs_before(p_year_month text) RETURNS bigint`
   - ガード不成立・形式不正・当月以降は `RAISE EXCEPTION`。件数（`LOGIN_SUCCESS` かつ `created_at < 指定月1日 JST`）を返す。
3. `public.delete_login_logs_before(p_year_month text) RETURNS bigint`
   - 同じ検証の後、単一 `DELETE ... WHERE action='LOGIN_SUCCESS' AND created_at < (指定月1日 00:00 JST)` を実行し、件数を取得。続けて `LOGIN_LOGS_PURGED` の記録行を INSERT（Global Constraints の仕様）。削除件数を返す。
   - 年月検証の正規表現: `^\d{4}-(0[1-9]|1[0-2])$`。当月判定は JST の現在月と文字列比較（`p_year_month >= to_char(now() AT TIME ZONE 'Asia/Tokyo','YYYY-MM')` なら拒否）。

**Tests（ローカル DB のみ）:** `supabase/tests/saas_login_logs.sql`（または同等の手順書）を作り、トランザクション内（最後に ROLLBACK）で以下を検証して出力を実装レポートに貼る。

- テストデータ: 2テナント × 複数月の `LOGIN_SUCCESS` と、別 action の行。
- SaaS管理者（`role=supaUser`）/ developer 相当として: 一覧が全テナント返る、テナント絞り込み、年月絞り込み、count と delete の件数が一致、指定月以降と別 action の行が残る、`LOGIN_LOGS_PURGED` が1行増える。
- 一般管理者・従業員として: 一覧は空、count/delete は例外。
- 当月・未来月・`2026-13`・`abc` は例外。
- ローカルで `supabase migration up` を実行して適用（`db reset` は使わない）。適用前に接続先がローカル（127.0.0.1:55422）であることを確認する。
- 実施後に `supabase gen types typescript --local > src/lib/supabase/types.ts` は**実行しない**（型は手書きで対応。差分の暴発を避ける）。

## Task 2: サイドメニュー登録マイグレーション

**Files:** Create `supabase/migrations/20260925090100_seed_saas_login_logs_service_master.sql`

`20260925072300_seed_login_logs_service_master.sql` と同じ構造で、`target_audience='saas_adm'`、`route_path='/saas_adm/login-logs'`、name「ログイン履歴（全テナント）」の service 行を追加する。

- UUID を直書きするのは新設 service の id のみ（新規の固定 UUID を生成して使う）。カテゴリは既存の `saas_adm` サービスの `route_path`（`/saas_adm/tenants` 等）から解決し、解決できなければ `RAISE WARNING` して `RETURN`。
- `AppSidebar` が saas_adm メニューをどう読むか（`src/components/layout/AppSidebar.tsx` 付近、`target_audience = 'saas_adm'`）を確認し、`tenant_service` / `app_role_service` の割当が必要ならその要否を実装レポートに記す。不要なら割当は作らない。
- ローカルで `supabase migration up` して行が入ることを SELECT で確認する。

## Task 3: ルート・Feature 層（queries / actions / 純粋関数とテスト）

**Files:**

- Modify `src/config/routes.ts`（`SAAS.LOGIN_LOGS: '/saas_adm/login-logs'`）
- Create `src/features/login-logs/saas-auth.ts`（`isSaasAdmin()`。`grant-notifier/queries.ts:379` と同じ判定。新規に作る）
- Create `src/features/login-logs/params.ts`（純粋関数）と `params.test.ts`
- Modify `src/features/login-logs/queries.ts`（追記のみ。既存 `getLoginLogs` は変更しない）
- Create `src/features/login-logs/actions.ts`

内容:

- `params.ts`: `YEAR_MONTH_RE`、`parseYearMonth(raw)`、`parseTenantId(raw)`（UUID 形式のみ許可）、`isPastYearMonth(ym, now)`（JST の当月より前か）、`LOGIN_LOG_MAX_ROWS = 5000`。`params.test.ts` に、正常系・境界（当月・前月・未来月・`2026-13`・空文字・非文字列・不正 UUID）のテストを書く（先にテストを書き、失敗を確認してから実装）。
- `queries.ts`: `SaasLoginLog` 型（`LoginLog` + `tenant_id: string | null`, `tenant_name: string | null`, `employee_name: string | null`）。`getAllTenantLoginLogs(yearMonth, tenantId)`（RPC `get_all_tenant_login_logs`、先頭で `isSaasAdmin()` を確認、失敗時は `console.error` して `[]`）。`getLoginLogTenantOptions()` は `{ id, name }[]` を名前昇順で返す（`tenants` を通常クライアントで SELECT。`is_template = true` は除外しない。RLS で SaaS管理者が全件読めるか確認し、読めない場合はその旨をレポートして RPC 方式を提案する）。
- `actions.ts`（`'use server'`）: `previewPurgeLoginLogs(yearMonth)` と `purgeLoginLogs(yearMonth)`。どちらも `isSaasAdmin()` → Zod v4 で検証 → `isPastYearMonth` で当月以降を拒否 → `supabase.rpc('count_login_logs_before' | 'delete_login_logs_before')`。戻り値は `{ success: boolean; count?: number; error?: string }`。削除成功時に `revalidatePath(APP_ROUTES.SAAS.LOGIN_LOGS)`。エラーは詳細を `console.error`、ユーザーには汎用の日本語メッセージ。

**検証:** `npm test`（追加テストが通る）、`npm run type-check`、`npm run lint`。

## Task 4: UI コンポーネントとページ

**Files:**

- Modify `src/features/login-logs/components/LoginLogPeriodSelector.tsx`（年月変更時に `useSearchParams` で他のクエリパラメータを保持。テナント管理者版の挙動は変えない）
- Create `src/features/login-logs/components/LoginLogTenantSelector.tsx`
- Create `src/features/login-logs/components/LoginLogPurgePanel.tsx`
- Create `src/features/login-logs/components/SaasLoginLogsView.tsx`
- Create `src/app/(saas-admin)/saas_adm/login-logs/page.tsx` と `loading.tsx`

内容:

- `LoginLogTenantSelector`: `select`。先頭「全て」、以降テナント名。変更時は `ym` を保持して `?tenant=` を更新（「全て」なら削除）。スタイルは `LoginLogPeriodSelector` に揃える。
- `SaasLoginLogsView`（client）: `LoginLogsView` を参考に4列（日時 / ユーザー名 / メールアドレス / テナント名、全列 `sortable: true`、`formatDateTimeInJST`、NULL は `---`）。フィルタカードに「対象年月」と「テナント」。件数表示。上限に達したら注意書き。下部（フィルタとは視覚的に分けて）に `LoginLogPurgePanel`。
- `LoginLogPurgePanel`（client）: 年月ドロップダウン（過去24ヶ月、**当月を除く**）→「削除対象を確認」ボタンで `previewPurgeLoginLogs` を呼び件数を表示（例「2026年3月1日より前のログ 12,345件」）→「削除する」（赤系）で確認ダイアログを開き、対象年月（`YYYY-MM`）の手入力が一致したときのみ実行ボタンを有効化 → `purgeLoginLogs`。成功時は削除件数を表示、失敗時はエラー表示。件数 0 の場合は削除ボタンを無効化。実行中は二重送信を防ぐ。
- `page.tsx`: `getServerUser()` で SaaS管理者以外は `APP_ROUTES.TENANT.PORTAL` へ redirect（layout と二重）。`searchParams` の `ym` / `tenant` を `parseYearMonth` / `parseTenantId` で検証。`Promise.all` で `getAllTenantLoginLogs` と `getLoginLogTenantOptions` を並列取得。`metadata.title = 'ログイン履歴（全テナント） | HR-DX'`。
- `loading.tsx`: `saas_adm/grant-notifier/loading.tsx` に倣う。

**検証:** `npm run type-check`、`npm run lint`。可能ならローカルで `npm run dev`（ポート3000）を起動して `/saas_adm/login-logs` の描画とフィルタ・ソート・削除フロー（ローカルのテストデータのみ）を確認する。ブラウザ確認が環境制約で不可なら、その旨をレポートに書く。

## 対象外（YAGNI）

- CSV エクスポート、ページネーション、バッチ分割削除（本番件数を SELECT で確認したうえで別途判断）。
