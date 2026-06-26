# サービス「タイトル・説明の自動作成」機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/saas_adm/system-master`「サービス」タブの「詳細変更」モーダルにある「AIアドバイスで自動生成」ボタン（現在はモック）を、`service.route_path` に対応する `page.tsx` のソースコードを Gemini で実際に解析し、タイトル（25文字以内）と説明（100文字以内）を生成する機能に置き換える。ボタン名称も「タイトル・説明の自動作成」に変更する。

**Architecture:** `src/lib/route-resolver.ts` に `route_path` → `page.tsx` ファイルパスを解決する純粋関数を新設し、`queries.ts`（一覧取得時の可用性フラグ付与）と `actions.ts`（生成処理本体）の両方から利用する。生成処理は既存の `src/lib/ai/gemini.ts`（`generateGeminiContent` / `GEMINI_FLASH_MODEL`）をそのまま再利用する。本番（Vercel）でも `page.tsx` を読めるよう `next.config.ts` に `outputFileTracingIncludes` を追加する。

**Tech Stack:** Next.js 16 Server Actions, TypeScript, `@google/genai`（既存ラッパー経由）, Node.js `fs`/`path`, `node:test` + `node:assert/strict`（既存のテスト方式、`./node_modules/.bin/tsx --test` で実行）。

## Global Constraints

- タイトルは最大25文字、description は最大100文字（仕様より、文字数は `string.length` で判定し超過分は切り詰める）
- ボタン文言は `タイトル・説明の自動作成`（`AIアドバイスで自動生成` から変更）
- 生成処理に使う Gemini モデルは `GEMINI_FLASH_MODEL`（Pro は使わない、コスト階層方針）
- `route_path` に対応する `page.tsx` が存在しない場合、生成ボタンは disabled にし、モーダルの `タイトル`/`説明` 表示は常に「開発中」/「開発中です。しばらくお待ちください。」を優先する（DBの保存済み値があっても上書き表示する。ただし保存しなければDBの実データは変わらない）
- コードコメントは日本語（プロジェクト規約）
- `console.log` を残さない
- `createAdminClient()` は既存パターンを踏襲（このプロジェクトは admin client を queries/actions で常用している）

---

## File Structure

| ファイル | 役割 |
|---|---|
| `src/lib/route-resolver.ts`（新規） | `route_path` → `page.tsx` 絶対パスの解決（純粋関数、`fs`/`path` のみに依存） |
| `src/lib/route-resolver.test.ts`（新規） | 上記のユニットテスト |
| `src/features/system-master/queries.ts`（修正） | `getServices()` に `ai_advice_available` フラグを付与 |
| `src/features/system-master/actions.ts`（修正） | `generateAiAdvice`（モック）を削除し `generateServiceAiAdvice` を新設 |
| `src/features/system-master/hooks/useSystemMaster.ts`（修正） | export 名を `generateServiceAiAdvice` に変更 |
| `src/features/system-master/components/ServiceTab.tsx`（修正） | ボタン文言変更、disabled制御、「開発中」プレースホルダー表示、呼び出し先変更 |
| `next.config.ts`（修正） | `outputFileTracingIncludes` 追加（本番での `page.tsx` 読み込み保証） |

---

## Task 1: ルート解決ヘルパー `resolvePageFilePath`

**Files:**
- Create: `src/lib/route-resolver.ts`
- Test: `src/lib/route-resolver.test.ts`

**Interfaces:**
- Produces: `export function resolvePageFilePath(routePath: string, appDir?: string): string | null`
  - 第2引数 `appDir` はテスト用に走査ルートを差し替えるためのオプション（デフォルトは `path.join(process.cwd(), 'src/app')`）
  - 戻り値はマッチした `page.tsx` の絶対パス、見つからなければ `null`

- [ ] **Step 1: テスト用の固定ディレクトリ構造を用意し、失敗するテストを書く**

`src/lib/route-resolver.test.ts` を新規作成：

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { resolvePageFilePath } from './route-resolver'

function makeTempAppDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-resolver-test-'))
  // /adm/job-positions → (tenant)/(tenant-admin)/adm/job-positions/page.tsx
  fs.mkdirSync(
    path.join(dir, '(tenant)', '(tenant-admin)', 'adm', 'job-positions'),
    { recursive: true }
  )
  fs.writeFileSync(
    path.join(dir, '(tenant)', '(tenant-admin)', 'adm', 'job-positions', 'page.tsx'),
    '// job-positions page'
  )
  // ルート直下の page.tsx（"/" に対応）
  fs.writeFileSync(path.join(dir, 'page.tsx'), '// root page')
  // ネストしたルートグループ
  fs.mkdirSync(
    path.join(dir, '(saas-admin)', 'saas_adm', '(base_mnt)', 'system-master'),
    { recursive: true }
  )
  fs.writeFileSync(
    path.join(dir, '(saas-admin)', 'saas_adm', '(base_mnt)', 'system-master', 'page.tsx'),
    '// system-master page'
  )
  return dir
}

test('ルートグループを含むパスを解決できる', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('/adm/job-positions', appDir)
  assert.equal(
    result,
    path.join(appDir, '(tenant)', '(tenant-admin)', 'adm', 'job-positions', 'page.tsx')
  )
})

test('ネストしたルートグループを含むパスを解決できる', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('/saas_adm/system-master', appDir)
  assert.equal(
    result,
    path.join(appDir, '(saas-admin)', 'saas_adm', '(base_mnt)', 'system-master', 'page.tsx')
  )
})

test('ルート直下の page.tsx を "/" として解決できる', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('/', appDir)
  assert.equal(result, path.join(appDir, 'page.tsx'))
})

test('一致するファイルがない場合は null を返す', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('/no-such-route', appDir)
  assert.equal(result, null)
})

test('空文字の場合は走査せず null を返す', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('', appDir)
  assert.equal(result, null)
})
```

- [ ] **Step 2: テストを実行し、失敗することを確認する**

Run: `./node_modules/.bin/tsx --test src/lib/route-resolver.test.ts`
Expected: FAIL（`route-resolver` モジュールが存在しないためエラー）

- [ ] **Step 3: 最小実装を書く**

`src/lib/route-resolver.ts` を新規作成：

```ts
import fs from 'node:fs'
import path from 'node:path'

/**
 * Next.js のルートグループ（"(xxx)" 形式のディレクトリ）は実URLのセグメントに現れない。
 * page.tsx を発見するたびに非グループセグメントだけを連結して実効URLを計算し、
 * service.route_path と比較することでファイルパスを解決する。
 */
function isRouteGroupSegment(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')')
}

function toEffectiveRoute(segments: string[]): string {
  const visible = segments.filter(s => !isRouteGroupSegment(s))
  return '/' + visible.join('/')
}

function findPageFile(
  dir: string,
  segments: string[],
  targetRoute: string
): string | null {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return null
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue

    if (entry.isFile() && entry.name === 'page.tsx') {
      if (toEffectiveRoute(segments) === targetRoute) {
        return path.join(dir, entry.name)
      }
      continue
    }

    if (entry.isDirectory()) {
      const found = findPageFile(
        path.join(dir, entry.name),
        [...segments, entry.name],
        targetRoute
      )
      if (found) return found
    }
  }

  return null
}

export function resolvePageFilePath(
  routePath: string,
  appDir: string = path.join(process.cwd(), 'src/app')
): string | null {
  if (!routePath) return null
  // "/" 始まりに正規化（service.route_path は通常 "/" 始まりだが念のため）
  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`
  return findPageFile(appDir, [], normalized)
}
```

- [ ] **Step 4: テストを実行し、すべて通ることを確認する**

Run: `./node_modules/.bin/tsx --test src/lib/route-resolver.test.ts`
Expected: PASS（5 tests, 0 fail）

- [ ] **Step 5: コミット**

```bash
git add src/lib/route-resolver.ts src/lib/route-resolver.test.ts
git commit -m "feat: add route_path to page.tsx resolver for system-master AI advice"
```

---

## Task 2: `getServices()` に `ai_advice_available` フラグを付与

**Files:**
- Modify: `src/features/system-master/queries.ts:42-66`
- Test: `src/features/system-master/queries.test.ts`（新規）

**Interfaces:**
- Consumes: `resolvePageFilePath(routePath: string): string | null`（Task 1）
- Produces: `getServices()` が返す各行に `ai_advice_available: boolean` フィールドが追加される。後続タスク（`ServiceTab.tsx`）はこのフィールド名で参照する。

`getServices()` は Supabase の admin client を使うため、フルの統合テストはせず、フラグ付与ロジックだけを切り出してテストする方針にする（Supabase 呼び出し自体は既存どおりモックしない）。

- [ ] **Step 1: フラグ付与ロジックを切り出した上で失敗するテストを書く**

`src/features/system-master/queries.test.ts` を新規作成：

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { withAiAdviceAvailability } from './queries'

test('route_path に対応するファイルがあれば true になる', () => {
  const rows = [{ id: 's1', route_path: '/adm/job-positions' }]
  const result = withAiAdviceAvailability(rows, () => '/abs/path/page.tsx')
  assert.equal(result[0].ai_advice_available, true)
})

test('route_path に対応するファイルがなければ false になる', () => {
  const rows = [{ id: 's1', route_path: '/no-such-route' }]
  const result = withAiAdviceAvailability(rows, () => null)
  assert.equal(result[0].ai_advice_available, false)
})

test('元の行の他フィールドは保持される', () => {
  const rows = [{ id: 's1', route_path: '/adm/x', name: 'テスト' }]
  const result = withAiAdviceAvailability(rows, () => '/abs/path/page.tsx')
  assert.equal(result[0].name, 'テスト')
})
```

- [ ] **Step 2: テストを実行し、失敗することを確認する**

Run: `./node_modules/.bin/tsx --test src/features/system-master/queries.test.ts`
Expected: FAIL（`withAiAdviceAvailability` が存在しない）

- [ ] **Step 3: `queries.ts` に関数を追加し `getServices()` から呼ぶ**

`src/features/system-master/queries.ts` の先頭 import に追加：

```ts
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePageFilePath } from '@/lib/route-resolver'
```

`getServices()`（既存42-66行）の直前に新規関数を追加し、`return` 行を変更する：

```ts
/**
 * 各サービス行に、route_path に対応する page.tsx が実在するかどうかのフラグを付与する。
 * resolver は第2引数として注入可能（テスト時に固定の結果を返すスタブを渡すため）。
 */
export function withAiAdviceAvailability<T extends { route_path?: string | null }>(
  rows: T[],
  resolver: (routePath: string) => string | null = resolvePageFilePath
): (T & { ai_advice_available: boolean })[] {
  return rows.map(row => ({
    ...row,
    ai_advice_available: resolver(row.route_path || '') !== null,
  }))
}

export async function getServices() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('service').select(`
      *,
      service_category (
        sort_order
      )
    `)

  if (error) {
    console.error('getServices error:', error)
    return []
  }

  const rows = data || []
  // 表示順: service_category.sort_order → service.sort_order（カテゴリ未設定は末尾）
  rows.sort((a, b) => {
    const ca = a.service_category?.sort_order ?? Number.MAX_SAFE_INTEGER
    const cb = b.service_category?.sort_order ?? Number.MAX_SAFE_INTEGER
    if (ca !== cb) return ca - cb
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  const withoutCategory = rows.map(({ service_category: _c, ...rest }) => rest)
  return withAiAdviceAvailability(withoutCategory)
}
```

- [ ] **Step 4: テストを実行し、すべて通ることを確認する**

Run: `./node_modules/.bin/tsx --test src/features/system-master/queries.test.ts`
Expected: PASS（3 tests, 0 fail）

- [ ] **Step 5: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし（既存の `any` ベースの型のため、新規フィールド追加で型エラーは出ない想定。出た場合は `queries.ts` の戻り値型注釈を確認して修正する）

- [ ] **Step 6: コミット**

```bash
git add src/features/system-master/queries.ts src/features/system-master/queries.test.ts
git commit -m "feat: add ai_advice_available flag to getServices()"
```

---

## Task 3: 生成 Server Action `generateServiceAiAdvice`

**Files:**
- Modify: `src/features/system-master/actions.ts`（262-284行のモック実装を置き換え）
- Test: `src/features/system-master/ai-advice.test.ts`（新規。`generateServiceAiAdvice` 本体は `createAdminClient`/`generateGeminiContent` に依存するため、文字数切り詰めとファイル未検出時の早期returnロジックを切り出してテストする）

**Interfaces:**
- Consumes:
  - `resolvePageFilePath(routePath: string): string | null`（Task 1）
  - `generateGeminiContent(opts: GeminiGenerateOptions): Promise<string>`（既存、`src/lib/ai/gemini.ts`）
  - `GEMINI_FLASH_MODEL`（既存、`src/lib/ai/gemini.ts`）
- Produces:
  - `export function truncateAiAdvice(data: { title: string; description: string }): { title: string; description: string }`（文字数切り詰め、テスト対象として export）
  - `export async function generateServiceAiAdvice(routePath: string, serviceName: string, categoryName: string): Promise<{ success: true; data: { title: string; description: string } } | { success: false; error: string }>`
    - 後続タスク（`useSystemMaster.ts`、`ServiceTab.tsx`）はこの関数名・型をそのまま使う

- [ ] **Step 1: 文字数切り詰めロジックの失敗するテストを書く**

`src/features/system-master/ai-advice.test.ts` を新規作成：

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { truncateAiAdvice } from './actions'

test('25文字以内のタイトルはそのまま', () => {
  const result = truncateAiAdvice({ title: 'あ'.repeat(25), description: 'd' })
  assert.equal(result.title.length, 25)
})

test('25文字を超えるタイトルは切り詰められる', () => {
  const result = truncateAiAdvice({ title: 'あ'.repeat(30), description: 'd' })
  assert.equal(result.title.length, 25)
})

test('100文字を超える description は切り詰められる', () => {
  const result = truncateAiAdvice({ title: 't', description: 'い'.repeat(120) })
  assert.equal(result.description.length, 100)
})
```

- [ ] **Step 2: テストを実行し、失敗することを確認する**

Run: `./node_modules/.bin/tsx --test src/features/system-master/ai-advice.test.ts`
Expected: FAIL（`truncateAiAdvice` が `actions.ts` に存在しない）

- [ ] **Step 3: `actions.ts` の既存モックを削除し、新実装を追加する**

`src/features/system-master/actions.ts` の import 部分（1-4行目）を変更：

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin' // ✅ adminクライアントを使用
import { revalidatePath } from 'next/cache'
import fs from 'node:fs/promises'
import { resolvePageFilePath } from '@/lib/route-resolver'
import { generateGeminiContent, GEMINI_FLASH_MODEL } from '@/lib/ai/gemini'
```

既存の262-284行目（`// --- AI Suggestion ---` から `generateAiAdvice` 関数全体）を、以下に置き換える：

```ts
// --- AI Suggestion ---

const MAX_TITLE_LENGTH = 25
const MAX_DESCRIPTION_LENGTH = 100
const MAX_SOURCE_CHARS = 8000

/**
 * 生成結果の文字数を仕様の上限内に防御的に切り詰める（LLMが制約を超える場合の保険）。
 */
export function truncateAiAdvice(data: { title: string; description: string }): {
  title: string
  description: string
} {
  return {
    title: data.title.slice(0, MAX_TITLE_LENGTH),
    description: data.description.slice(0, MAX_DESCRIPTION_LENGTH),
  }
}

const AI_ADVICE_SYSTEM_PROMPT =
  'あなたは日本語のSaaSプロダクトのUXコピーライターです。渡されたNext.js/Reactコンポーネントのソースコードを解析し、' +
  'エンドユーザーが実際に使う機能として何を行うものかを正確に読み取った上で、管理画面のサービス一覧に表示するための、' +
  `タイトル（${MAX_TITLE_LENGTH}文字以内）とdescription（${MAX_DESCRIPTION_LENGTH}文字以内）を日本語で作成してください。` +
  '誇大な煽り文句や事実と異なる効果（具体的な削減率など）は含めないでください。'

/**
 * サービスの route_path に対応するページコンポーネントのソースコードを解析し、
 * タイトル・descriptionを Gemini で生成する。
 */
export async function generateServiceAiAdvice(
  routePath: string,
  serviceName: string,
  categoryName: string
): Promise<
  | { success: true; data: { title: string; description: string } }
  | { success: false; error: string }
> {
  const filePath = resolvePageFilePath(routePath)
  if (!filePath) {
    return { success: false, error: 'ページコンポーネントが見つかりませんでした' }
  }

  try {
    const rawSource = await fs.readFile(filePath, 'utf-8')
    const source = rawSource.slice(0, MAX_SOURCE_CHARS)

    const prompt =
      `サービス名: ${serviceName}\n` +
      `カテゴリ名: ${categoryName}\n` +
      `ページコンポーネントのソースコード:\n${source}`

    const responseText = await generateGeminiContent({
      model: GEMINI_FLASH_MODEL,
      system: AI_ADVICE_SYSTEM_PROMPT,
      prompt,
      json: true,
      responseJsonSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title', 'description'],
      },
    })

    const parsed = JSON.parse(responseText) as { title: string; description: string }
    return { success: true, data: truncateAiAdvice(parsed) }
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    return { success: false, error: `AI生成に失敗しました: ${message}` }
  }
}
```

- [ ] **Step 4: テストを実行し、すべて通ることを確認する**

Run: `./node_modules/.bin/tsx --test src/features/system-master/ai-advice.test.ts`
Expected: PASS（3 tests, 0 fail）

- [ ] **Step 5: 型チェックを実行する**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/features/system-master/actions.ts src/features/system-master/ai-advice.test.ts
git commit -m "feat: replace mock AI advice with real Gemini-based generation from page source"
```

---

## Task 4: `useSystemMaster` フックの export 名を更新

**Files:**
- Modify: `src/features/system-master/hooks/useSystemMaster.ts`

**Interfaces:**
- Consumes: `generateServiceAiAdvice`（Task 3 で `actions.ts` から export）
- Produces: `useSystemMaster()` の戻り値オブジェクトが `generateServiceAiAdvice` キーを持つ（旧 `generateAiAdvice` キーは削除）

- [ ] **Step 1: import文と戻り値オブジェクトを変更する**

`src/features/system-master/hooks/useSystemMaster.ts` の23行目を変更：

```ts
  generateServiceAiAdvice,
} from '../actions'
```

60行目付近を変更：

```ts
    // AI Advice
    generateServiceAiAdvice,
```

- [ ] **Step 2: 型チェックを実行する**

Run: `npm run type-check`
Expected: この時点では `ServiceTab.tsx` が旧 `generateAiAdvice` を参照しているためエラーになる。Task 5 で解消されることを確認した上で進める（このタスク単体ではコミットせず、Task 5 とまとめてコミットする）。

---

## Task 5: `ServiceTab.tsx` のUI変更（ボタン文言・disabled制御・呼び出し先）

**Files:**
- Modify: `src/features/system-master/components/ServiceTab.tsx`

**Interfaces:**
- Consumes: `generateServiceAiAdvice(routePath: string, serviceName: string, categoryName: string)`（Task 3/4）、各サービス行の `ai_advice_available: boolean`（Task 2）

- [ ] **Step 1: フック呼び出しと state を変更する**

`src/features/system-master/components/ServiceTab.tsx` の13行目を変更：

```ts
  const { updateService, createService, deleteService, generateServiceAiAdvice } =
    useSystemMaster()
```

29行目の直後（`isAiLoading` の宣言の後）に state を追加：

```ts
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiAdviceAvailable, setAiAdviceAvailable] = useState(true)
```

- [ ] **Step 2: `openModal` を変更し、ファイル未検出時に「開発中」を優先表示する**

145-151行目の `openModal` を以下に置き換える：

```ts
  const openModal = (id: string) => {
    const svc = services.find(s => s.id === id)
    if (!svc) return
    const available = Boolean(svc.ai_advice_available)
    setAiAdviceAvailable(available)
    if (available) {
      setModalTitle(svc.title || '')
      setModalDescription(svc.description || '')
    } else {
      // 対応する page.tsx が存在しないため、保存済みの値より「開発中」表示を優先する
      setModalTitle('開発中')
      setModalDescription('開発中です。しばらくお待ちください。')
    }
    setModalServiceId(id)
  }
```

- [ ] **Step 3: `handleAiAdvice` の呼び出し先を変更する**

118-143行目の `handleAiAdvice` を以下に置き換える：

```ts
  const handleAiAdvice = async () => {
    if (!modalServiceId) return
    setIsAiLoading(true)
    try {
      const svc = services.find(s => s.id === modalServiceId)
      const cat = categories.find(c => c.id === svc?.service_category_id)

      const result = await generateServiceAiAdvice(
        svc?.route_path || '',
        svc?.name || '',
        cat?.name || ''
      )

      if (result.success) {
        setModalTitle(result.data.title)
        setModalDescription(result.data.description)
      } else {
        alert(`AIアドバイスの取得に失敗しました: ${result.error}`)
      }
    } catch (err: any) {
      alert(`AIエラー: ${err.message}`)
    } finally {
      setIsAiLoading(false)
    }
  }
```

- [ ] **Step 4: ボタンの文言・disabled・ツールチップを変更する**

475-486行目のボタンを以下に置き換える：

```tsx
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAiAdvice}
                  disabled={isAiLoading || loading || !aiAdviceAvailable}
                  title={
                    aiAdviceAvailable
                      ? undefined
                      : '対応するページが見つからないため自動生成できません'
                  }
                  className={`flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-orange-600 text-white font-bold text-xs rounded-md hover:opacity-90 transition-opacity shadow-xs ${
                    isAiLoading || !aiAdviceAvailable ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="text-base">✨</span>
                  {isAiLoading ? 'AI考え中...' : 'タイトル・説明の自動作成'}
                </button>
              </div>
```

- [ ] **Step 5: 型チェックと lint を実行する**

Run: `npm run type-check && npm run lint`
Expected: エラーなし（Task 4 で発生していた型エラーもここで解消される）

- [ ] **Step 6: コミット**

```bash
git add src/features/system-master/hooks/useSystemMaster.ts src/features/system-master/components/ServiceTab.tsx
git commit -m "feat: wire ServiceTab to real AI advice generation and rename button"
```

---

## Task 6: 本番（Vercel）でのファイルトレーシング対応

**Files:**
- Modify: `next.config.ts`

**Interfaces:**
- なし（ビルド設定のみ、ランタイムコードへの影響なし）

- [ ] **Step 1: `outputFileTracingIncludes` を追加する**

`next.config.ts` の `experimental` ブロック（12-26行目）を以下に変更：

```ts
  experimental: {
    // ミドルウェアがボディを複製するときの上限。既定 ~10MB だと大きめの multipart が途中で切れ
    // busboy が「Unexpected end of form」を出すことがあるため serverActions より少し大きくする
    proxyClientMaxBodySize: "55mb",
    serverActions: {
      bodySizeLimit: "50mb",
      // 本番カスタムドメイン・Vercel ホスト・ローカルで Server Action の Origin 検証を通す
      allowedOrigins: [
        "https://app.hr-dx.jp",
        ...(vercelOrigin ? [vercelOrigin] : []),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ],
    },
    // system-master の「タイトル・説明の自動作成」が route_path から page.tsx の
    // ソースを実行時に読むため、サーバーレス関数バンドルに全 page.tsx を明示的に含める
    outputFileTracingIncludes: {
      "/saas_adm/system-master/**": ["./src/app/**/page.tsx"],
    },
  },
```

- [ ] **Step 2: ビルドを実行して設定が認識されることを確認する**

Run: `npm run build`
Expected: ビルドが成功する（既存のビルドエラーがある場合はこのタスクの範囲外。`outputFileTracingIncludes` 自体の構文エラーがないことを確認する）

- [ ] **Step 3: コミット**

```bash
git add next.config.ts
git commit -m "build: include all page.tsx files in system-master function bundle for AI advice feature"
```

---

## Task 7: 手動動作確認

**Files:** なし（コード変更なし、動作確認のみ）

- [ ] **Step 1: ローカル環境変数を確認する**

`.env.local` に `GEMINI_API_KEY` が設定されていることを確認する。未設定の場合、`generateServiceAiAdvice` は `{ success: false, error: 'AI生成に失敗しました: GEMINI_API_KEY が設定されていません' }` を返す（`src/lib/ai/gemini.ts:25` の既存エラーメッセージ）。

- [ ] **Step 2: 開発サーバーを起動する**

Run: `npm run dev`

- [ ] **Step 3: 実在する route_path を持つサービスで動作確認する**

`/saas_adm/system-master` の「サービス」タブを開き、`route_path` が `/adm/job-positions` 等の実在するサービスの「詳細変更」を押下。「タイトル・説明の自動作成」ボタンが有効であることを確認し、押下後にそのページの機能と整合するタイトル・説明が生成されることを確認する。

- [ ] **Step 4: route_path が空、または存在しないサービスで動作確認する**

該当サービスの「詳細変更」を開き、タイトルに「開発中」、説明に「開発中です。しばらくお待ちください。」が表示され、自動作成ボタンが disabled（カーソルが not-allowed）になっていることを確認する。

- [ ] **Step 5: 生成結果を保存し、DBに反映されることを確認する**

「保存して閉じる」を押下し、一覧の該当行の「タイトル」列が `●` 表示に変わることを確認する（再度モーダルを開いて保存済みの値が表示されることも確認）。
