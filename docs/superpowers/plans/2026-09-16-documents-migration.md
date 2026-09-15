# 文書ホルダー（documents）機能移植 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dx-sensor（`/home/hr-dx/ai-projects/dx-sensor`）の文書ホルダー（`/documents`, `/documents/new`、4タイプ）を、hr-dx-saas の `src/app/(tenant)/(tenant-users)/tool/documents/` へ、ハイブリッド可視範囲・本人のみ mutate・Server Actions・Gemini OCR・CSV・サービスマスタ8本付きで移植する。

**Architecture:** プラグイン構成（`business_card` / `invoice` / `purchase_order` / `receipt`）を維持しつつ、dx-sensor の `app/api/documents/*` を `src/features/documents/{queries,actions}.ts` に置換する。DB は `captured_documents` + images + line_items + Storage `captured-documents`。名刺は `company_visible` でテナント共有、その他は同一 `division_id` のマネージャー閲覧。

**Tech Stack:** Next.js 16 App Router / React 19 / TypeScript / Supabase (PostgreSQL + RLS + Storage) / Zod / Gemini Vision API / `node:test`

**Spec:** `docs/superpowers/specs/2026-09-16-documents-migration-design.md`

## Global Constraints

- 新規テーブルは `CREATE TABLE IF NOT EXISTS`、外部キーは `ON DELETE CASCADE`（CLAUDE.md 絶対禁止事項）
- 新規テーブルには必ず RLS を設定する
- `page.tsx` 内で `supabase.from(...)` を直接呼ばない。SELECT は `queries.ts`、書き込みは `actions.ts`
- `app/api/documents/**` は作らない
- URL は `APP_ROUTES` 定数を使う（クエリ付きリンクはヘルパーで組み立て可）
- コードコメントは日本語
- テストは `node --import tsx --test "src/**/*.test.ts"`（`node:assert/strict` + `node:test`）
- E2E 基盤新設はスコープ外。手動確認手順を記述する
- 日時は `Asia/Tokyo`
- データ取得ルートに `loading.tsx` / `error.tsx`
- マイグレーション適用は `supabase migration up`（`db reset` 禁止）
- `createAdminClient()` は end-user 向け `actions.ts` で使わない
- `image_analysis_runs` 連携は作らない（hr-dx-saas にテーブルなし）

---

## File Structure

```
supabase/migrations/
  20260916010000_create_captured_documents.sql
  20260916010100_seed_documents_service_master.sql

src/lib/service-route.ts                    # クエリ付き route_path 対応（修正）
src/lib/service-route.test.ts               # テスト追加

src/lib/documents/
  storagePaths.ts / storagePaths.test.ts
  tokyoDate.ts
  findDuplicate.ts / findDuplicate.test.ts
  lineItems.ts / lineItems.test.ts
  exportCsv.ts / exportCsv.test.ts
  cleanupTmp.ts

src/lib/image-analysis/
  types.ts
  gemini/gemini.ts
  document-ocr/parseVisionJson.ts / parseVisionJson.test.ts
  document-ocr/documentOcr.ts / documentOcr.test.ts

src/features/documents/
  types.ts
  canMutateDocument.ts / canMutateDocument.test.ts
  plugins/registry.ts
  plugins/pluginTypes.ts
  plugins/types/business_card/plugin.ts (+test)
  plugins/types/invoice/plugin.ts (+test)
  plugins/types/purchase_order/plugin.ts (+test)
  plugins/types/receipt/plugin.ts (+test)
  queries.ts
  actions.ts
  actions.test.ts
  components/                               # Capture* / *Album / Overlay

src/config/routes.ts                        # TOOL_DOCUMENTS* 追加
.env.example                                # GEMINI_* 追記

src/app/(tenant)/(tenant-users)/tool/documents/
  page.tsx / DocumentsAlbumHost.tsx / loading.tsx / error.tsx
  new/page.tsx / CaptureHost.tsx / loading.tsx / error.tsx
```

**移植元（読み取り専用・コピー元）:**

- `/home/hr-dx/ai-projects/dx-sensor/src/app/(tenant)/documents/**`
- `/home/hr-dx/ai-projects/dx-sensor/src/app/api/documents/**`（ロジック参照のみ、Route は作らない）
- `/home/hr-dx/ai-projects/dx-sensor/src/lib/documents/**`
- `/home/hr-dx/ai-projects/dx-sensor/src/lib/image-analysis/{gemini,document-ocr,types.ts}`

---

### Task 1: メニューリンクのクエリ対応

**Files:**

- Modify: `src/lib/service-route.ts`
- Modify: `src/lib/service-route.test.ts`

**Interfaces:**

- Consumes: 既存 `resolvePageFilePath`
- Produces: `resolveServiceLinkHref` が `?type=...` を保持した href を返す

- [ ] **Step 1: 失敗するテストを追加する**

```ts
test('pathname と search を分離してから解決する', () => {
  const result = resolveServiceLinkHref('/adm/job-positions?type=x', appDir)
  assert.equal(result, '/adm/job-positions?type=x')
})
```

- [ ] **Step 2: テスト実行（失敗確認）**

Run: `node --import tsx --test src/lib/service-route.test.ts`  
Expected: 新テスト FAIL（現状はクエリがパス末尾に混ざり `#` または誤った path になる）

- [ ] **Step 3: `resolveServiceLinkHref` を修正**

```ts
export function resolveServiceLinkHref(
  routePath: string | null | undefined,
  appDir?: string
): string {
  if (!routePath?.trim()) return '#'

  let normalized = routePath.trim()
  if (!normalized.startsWith('/')) normalized = `/${normalized}`

  const qIndex = normalized.indexOf('?')
  const pathname = qIndex >= 0 ? normalized.slice(0, qIndex) : normalized
  const search = qIndex >= 0 ? normalized.slice(qIndex) : ''

  const segments = pathname.split('/').filter(Boolean)
  let staticSegments = segments.filter(segment => !DYNAMIC_SEGMENT.test(segment))

  while (staticSegments.length > 0) {
    const candidate = `/${staticSegments.join('/')}`
    if (resolvePageFilePath(candidate, appDir)) {
      return `${candidate}${search}`
    }
    staticSegments = staticSegments.slice(0, -1)
  }

  return '#'
}
```

- [ ] **Step 4: テスト成功を確認**

Run: `node --import tsx --test src/lib/service-route.test.ts`  
Expected: PASS

---

### Task 2: DBマイグレーション（テーブル・RLS・Storage）

**Files:**

- Create: `supabase/migrations/20260916010000_create_captured_documents.sql`

**Interfaces:**

- Produces: `captured_documents`, `captured_document_images`, `captured_document_line_items`, bucket `captured-documents`
- Reuses: `current_tenant_id()`, `current_employee_division_id()`, `current_employee_is_manager()`（picture-report で定義済み）

- [ ] **Step 1: マイグレーションファイルを作成する**

主要 DDL（ファイルには完全 SQL を書く）:

```sql
-- 20260916010000_create_captured_documents.sql
-- 参照: docs/superpowers/specs/2026-09-16-documents-migration-design.md

CREATE TABLE IF NOT EXISTS public.captured_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_mode text,
  company_visible boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT '',
  counterparty text NOT NULL DEFAULT '',
  context_date date,
  amount_yen numeric(12, 2),
  notes text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_ocr text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.captured_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY captured_documents_select ON public.captured_documents
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      owner_user_id = auth.uid()
      OR (document_type = 'business_card' AND company_visible = true)
      OR (
        division_id = public.current_employee_division_id()
        AND public.current_employee_is_manager()
      )
    )
  );

CREATE POLICY captured_documents_insert ON public.captured_documents
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND owner_user_id = auth.uid()
  );

CREATE POLICY captured_documents_update ON public.captured_documents
  FOR UPDATE
  USING (tenant_id = public.current_tenant_id() AND owner_user_id = auth.uid())
  WITH CHECK (tenant_id = public.current_tenant_id() AND owner_user_id = auth.uid());

CREATE POLICY captured_documents_delete ON public.captured_documents
  FOR DELETE USING (
    tenant_id = public.current_tenant_id() AND owner_user_id = auth.uid()
  );
```

続けて `captured_document_images` / `captured_document_line_items`（親の可視・所有者に追従）と Storage バケット `captured-documents`（tmp/final ポリシー）を書く。dx-sensor `0019`〜`0021` を参照しつつ、`auth_tenant_ids` / `has_tenant_role` / `is_app_developer` / `image_analysis_runs` は使わない。

- [ ] **Step 2: ローカルへ適用（データ破壊なし）**

Target DB: ローカル `127.0.0.1:55422`  
Run: `supabase migration up`  
Expected: 成功。Studio で3テーブルと bucket を確認

- [ ] **Step 3: 型生成**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`  
Expected: `captured_documents` 等が型に含まれる

---

### Task 3: 純関数ライブラリ移植（documents）

**Files:**

- Create: `src/lib/documents/storagePaths.ts` (+test)
- Create: `src/lib/documents/tokyoDate.ts`
- Create: `src/lib/documents/findDuplicate.ts` (+test)
- Create: `src/lib/documents/lineItems.ts` (+test)
- Create: `src/lib/documents/exportCsv.ts` (+test)
- Create: `src/lib/documents/cleanupTmp.ts`

**Interfaces:**

- Produces: `BUCKET`, `tmpObjectPath`, `finalObjectPath`, `isTmpPath`, `tokyoToday`, `findDuplicate`, line item helpers, CSV builders

- [ ] **Step 1: dx-sensor からコピーし import パスを `@/lib/documents/...` に合わせる**

```ts
export const BUCKET = 'captured-documents'

export function tmpObjectPath(tenantId: string, userId: string, fileId: string): string {
  return `${tenantId}/tmp/${userId}/${fileId}.jpg`
}

export function finalObjectPath(
  tenantId: string,
  documentType: string,
  dateYmd: string,
  documentId: string,
  fileId: string
): string {
  return `${tenantId}/${documentType}/${dateYmd}/${documentId}/${fileId}.jpg`
}
```

- [ ] **Step 2: 対応する `*.test.ts` も移植し実行**

Run: `node --import tsx --test "src/lib/documents/**/*.test.ts"`  
Expected: PASS

---

### Task 4: プラグイン + canMutateDocument

**Files:**

- Create: `src/features/documents/plugins/**`（dx-sensor `src/lib/documents/{pluginTypes,registry,types/*}` を features へ）
- Create: `src/features/documents/canMutateDocument.ts` (+test)

**Interfaces:**

- Produces: `getDocumentPlugin(id)`, `DocumentTypePlugin`, `canMutateDocument({ actorUserId, ownerUserId })`

- [ ] **Step 1: プラグイン4種 + registry を移植（テスト付き）**

import を `@/features/documents/plugins/...` に変更。

- [ ] **Step 2: canMutate を本人のみに簡略化**

```ts
export function canMutateDocument(input: { actorUserId: string; ownerUserId: string }): boolean {
  return input.actorUserId === input.ownerUserId
}
```

- [ ] **Step 3: テスト実行**

Run: `node --import tsx --test "src/features/documents/canMutateDocument.test.ts" "src/features/documents/plugins/**/*.test.ts"`  
Expected: PASS（admin 分岐テストは削除または本人のみに書き換え）

---

### Task 5: Gemini OCR ライブラリ

**Files:**

- Create: `src/lib/image-analysis/types.ts`
- Create: `src/lib/image-analysis/gemini/gemini.ts`
- Create: `src/lib/image-analysis/document-ocr/parseVisionJson.ts` (+test)
- Create: `src/lib/image-analysis/document-ocr/documentOcr.ts` (+test)
- Modify: `.env.example`

**Interfaces:**

- Produces: `ocrDocument(input: DocumentOcrInput): Promise<DocumentOcrResult>`
- Env: `GEMINI_API_KEY`, `GEMINI_VISION_MODEL`（default `gemini-2.5-flash`）

- [ ] **Step 1: dx-sensor から最小セットを移植（plate-recognizer 等は不要）**

`documentOcr` の plugin import を `@/features/documents/plugins/pluginTypes` に向ける。

- [ ] **Step 2: `.env.example` に追記**

```bash
# 文書ホルダー OCR（Gemini Vision）
GEMINI_API_KEY=
GEMINI_VISION_MODEL=gemini-2.5-flash
```

- [ ] **Step 3: ユニットテスト（モック fetch）を実行**

Run: `node --import tsx --test "src/lib/image-analysis/**/*.test.ts"`  
Expected: PASS

---

### Task 6: types / queries / actions

**Files:**

- Create: `src/features/documents/types.ts`
- Create: `src/features/documents/queries.ts`
- Create: `src/features/documents/actions.ts`
- Create: `src/features/documents/actions.test.ts`
- Modify: `src/config/routes.ts`

**Interfaces:**

- Produces:
  - `listDocuments(params): Promise<ListResult>`
  - `getDocumentDetail(id): Promise<Detail | null>`
  - `analyzeDocument(formData): Promise<AnalyzeResult>`
  - `createDocument(input): Promise<ActionResult>`
  - `updateDocument(input): Promise<ActionResult>`
  - `deleteDocument(id): Promise<ActionResult>`
  - `reanalyzeDocument(id): Promise<AnalyzeResult>`
  - `exportDocumentsCsv(input): Promise<{ csv: string } | { error: string }>`
- Routes: `APP_ROUTES.TENANT.TOOL_DOCUMENTS`, `TOOL_DOCUMENTS_NEW`

- [ ] **Step 1: routes 追加**

```ts
/** 文書ホルダー一覧（?type=business_card|invoice|purchase_order|receipt） */
TOOL_DOCUMENTS: '/tool/documents',
/** 文書撮影・登録 */
TOOL_DOCUMENTS_NEW: '/tool/documents/new',
```

- [ ] **Step 2: Zod スキーマと ActionResult 型を `types.ts` に定義**

- `document_type` enum 4値
- 非 `business_card` では `company_visible` を常に false に強制（Action 内）
- `division_id` 未設定ユーザーは create を拒否（`所属部署が未設定です`）

- [ ] **Step 3: `queries.ts` 実装**

```ts
export type DocumentListScope = 'own' | 'team' | 'company'

export async function listDocuments(params: {
  type: string
  mode?: string | null
  scope: DocumentListScope
  offset?: number
  q?: string
}) {
  // createClient + getServerUser
  // scope=own: owner_user_id = user.id
  // scope=team: require is_manager; RLS が同部門に制限
  // scope=company: document_type=business_card AND company_visible=true
}

export async function getDocumentDetail(id: string) {
  // document + images + line_items + createSignedUrl
}
```

- [ ] **Step 4: `actions.ts` — analyze / create / update / delete / reanalyze / export**

パターン（picture-report 準拠）:

```ts
'use server'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { ocrDocument } from '@/lib/image-analysis/document-ocr/documentOcr'
import { getDocumentPlugin } from '@/features/documents/plugins/registry'
import { canMutateDocument } from './canMutateDocument'

export async function analyzeDocument(formData: FormData) {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false as const, error: '認証エラー' }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { success: false as const, error: 'OCR設定がありません' }
  // FormData から画像を取り、plugin + ocrDocument
}
```

`createDocument` は dx-sensor `POST /api/documents` のフロー（重複検出・tmp→final・line_items）を移植。`owner_user_id = user.id`, `division_id = user.division_id`, `tenant_id = user.tenant_id`。

`exportDocumentsCsv` は invoice / purchase_order のみ許可。

- [ ] **Step 5: actions.test.ts（Zod・canMutate・非名刺 company_visible 強制）**

Run: `node --import tsx --test src/features/documents/actions.test.ts`  
Expected: PASS

- [ ] **Step 6: revalidatePath**

成功時: `revalidatePath(APP_ROUTES.TENANT.TOOL_DOCUMENTS)`（必要なら NEW も）

---

### Task 7: 画面 — new（撮影）

**Files:**

- Create: `src/app/(tenant)/(tenant-users)/tool/documents/new/page.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tool/documents/new/CaptureHost.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tool/documents/new/loading.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tool/documents/new/error.tsx`
- Create: `src/features/documents/components/*Capture*.tsx`（dx-sensor から移植）

**Interfaces:**

- Consumes: `analyzeDocument`, `createDocument`, `getServerUser`, plugins
- Produces: 動作する `/tool/documents/new?type=...`

- [ ] **Step 1: `page.tsx`（Server）**

```tsx
import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { tokyoToday } from '@/lib/documents/tokyoDate'
import { CaptureHost } from './CaptureHost'

const ALLOWED = ['business_card', 'invoice', 'purchase_order', 'receipt'] as const

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  if (!ALLOWED.includes(type as (typeof ALLOWED)[number])) notFound()

  const user = await getServerUser()
  if (!user) redirect('/login')
  if (!user.division_id) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm">
        所属部署が未設定のため文書を登録できません。管理者にお問い合わせください。
      </div>
    )
  }

  return (
    <CaptureHost
      documentType={type as (typeof ALLOWED)[number]}
      defaultContextDate={tokyoToday()}
      isManager={user.is_manager}
    />
  )
}
```

- [ ] **Step 2: Capture コンポーネント移植**

dx-sensor の各 `*CaptureForm.tsx` / `CaptureDocumentForm.tsx` を `features/documents/components/` へコピーし:

- `fetch('/api/documents/analyze')` → `analyzeDocument`
- `fetch('/api/documents')` → `createDocument`
- 成功後 `router.push(\`${APP_ROUTES.TENANT.TOOL_DOCUMENTS}?type=...\`)`
- 直 Supabase client 呼び出しを削除

- [ ] **Step 3: loading / error を配置**

- [ ] **Step 4: 手動確認**

`npm run dev` → `/tool/documents/new?type=business_card` が描画されること。

---

### Task 8: 画面 — 一覧（Album）

**Files:**

- Create: `src/app/(tenant)/(tenant-users)/tool/documents/page.tsx`
- Create: `src/app/(tenant)/(tenant-users)/tool/documents/DocumentsAlbumHost.tsx`
- Create: loading/error
- Create: `src/features/documents/components/*Album*.tsx`, `DocumentImagePreviewOverlay.tsx`

**Interfaces:**

- Consumes: `listDocuments`, `getDocumentDetail`, `updateDocument`, `deleteDocument`, `reanalyzeDocument`, `exportDocumentsCsv`

- [ ] **Step 1: `page.tsx` で user + type を渡し Host を描画**

- [ ] **Step 2: Album を移植し fetch→Actions / 初期データを Server から Props 渡し**

| タイプ        | タブ                                 |
| ------------- | ------------------------------------ |
| business_card | own / company（+ manager なら team） |
| その他        | own（+ manager なら team）           |

編集・削除・再解析・公開トグルは本人のみ表示。

- [ ] **Step 3: CSV ボタン（invoice / purchase_order）**

`exportDocumentsCsv` の結果を Blob ダウンロード。

- [ ] **Step 4: 手動確認**

各 `?type=` で一覧が表示されること。

---

### Task 9: サービスマスタシード

**Files:**

- Create: `supabase/migrations/20260916010100_seed_documents_service_master.sql`

**Interfaces:**

- Produces: category「文書ホルダー」+ 8 services + app_role_service + tenant_service

- [ ] **Step 1: シード SQL（picture-report / task-management と同冪等パターン）**

- `service_class`「便利ツール」を名前解決
- `service_category`「文書ホルダー」を作成・紐付け
- 8 services（`route_path` に `?type=` を含める。設計書セクション7の表どおり）
- `app_role_service` 全ロール
- `tenant_service` 全テナント
- `target_audience = 'all_users'`, `release_status = '公開'`

- [ ] **Step 2: `supabase migration up`（ローカル）**

- [ ] **Step 3: ポータルのサブメニューからクエリ付きリンクが開くこと（Task 1 の修正が効いていること）を確認**

---

### Task 10: 手動受入チェックリスト

- [ ] **名刺**: 撮影→解析→保存→自分の一覧→公開トグル→別ユーザーで「公開」に見える→非公開は見えない（同部門マネージャーには見える）
- [ ] **請求書**: 撮影→明細→保存→一覧→CSV
- [ ] **発注書**: 同上
- [ ] **領収書**: expense / qualified_invoice モード切替
- [ ] **権限**: 他人の文書の編集・削除ボタンが出ない／Action も失敗
- [ ] **未配属**: division_id null ユーザーは new でブロック
- [ ] **メニュー**: 便利ツール → 文書ホルダーに8カード
- [ ] **型チェック**: `npm run type-check`
- [ ] **関連テスト**:  
      `node --import tsx --test "src/lib/service-route.test.ts" "src/lib/documents/**/*.test.ts" "src/lib/image-analysis/**/*.test.ts" "src/features/documents/**/*.test.ts"`

---

## Self-Review（計画著者チェック済み）

| Spec 要件                           | Task          |
| ----------------------------------- | ------------- |
| 4タイプ移植                         | 4, 7, 8       |
| ハイブリッド RLS                    | 2             |
| 本人のみ mutate                     | 2, 4, 6       |
| company_visible 名刺のみ            | 6, 8          |
| Server Actions（APIなし）           | 6             |
| Gemini OCR                          | 5, 6          |
| CSV                                 | 3, 6, 8       |
| メニュー8 + 便利ツール/文書ホルダー | 9             |
| クエリ付きメニューリンク            | 1, 9          |
| loading/error                       | 7, 8          |
| image_analysis_runs なし            | 2（明示除外） |

プレースホルダ（TBD）なし。型名は Task 間で `DocumentListScope` / `canMutateDocument` / `ocrDocument` で統一。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-16-documents-migration.md`.

**Two execution options:**

1. **Subagent-Driven（recommended）** — タスクごとに新規サブエージェント、レビュー挟みながら高速反復
2. **Inline Execution** — このセッションで executing-plans によりバッチ実行＋チェックポイント

どちらで進めますか？
