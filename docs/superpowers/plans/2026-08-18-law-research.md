# 調べる（税法・労務法・法令）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 人事担当者が税法・労務法・一般法令の条文・通達・裁決事例の原文を `/adm/research` から検索・閲覧できるようにする。

**Architecture:** `tax-law-mcp` / `labor-law-mcp` のサービス層を **deep import** で直接呼ぶ（MCP プロトコル・子プロセスは使わない）。外部通信はすべて Server Actions 内。取得した原文は DB に保存せず毎回一次情報を取りに行く。AI は取得済み原文の要約のみを担当し、検索も生成もしない。

**Tech Stack:** Next.js 16 App Router / React 19 / TypeScript（strict: false）/ Supabase（PostgreSQL + RLS）/ Tailwind CSS v4 / OpenRouter（`google/gemini-2.5-flash`）/ Node 標準テストランナー

**Spec:** `docs/implementation-plan-law-research.md`

## Global Constraints

すべてのタスクの要件に、以下が暗黙的に含まれる。

- **テストランナーは vitest ではない。** `npm test` = `node --import tsx --test "src/**/*.test.ts"`。テストは `node:test` の `test()` と `node:assert/strict` を使う。テストファイルは対象ソースと同じディレクトリに `<name>.test.ts` で置く
- 単一テストの実行は `node --import tsx --test src/features/law-research/lib/normalize.test.ts` のようにファイルパスを直接指定する
- 型チェックは `npm run type-check`（= `tsc --noEmit`）
- 依存バージョンは**完全固定**（`^` や `~` を付けない）: `tax-law-mcp` は `0.5.4`、`labor-law-mcp` は `0.2.1`
- TypeScript は `strict: false`
- **`strict: false` の落とし穴:** `ResearchResult` のような判別可能ユニオンを `if (result.ok) { … } else { result.error }` で分岐すると、else 側が誤って `{ ok: true }` に絞られて型エラーになる（実機確認済み）。**`if (result.ok === true)` と明示比較すること。** `if (!result.ok) return result.error` も同様に通らない
- **コードコメントは日本語で書く**
- `createAdminClient()` は使用禁止。`createClient()`（`@/lib/supabase/server`）のみ
- URL のハードコード禁止。`APP_ROUTES`（`@/config/routes`）から参照する
- 新規テーブルには必ず RLS を設定する
- SQL は `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` を使う。テーブル削除・全行削除・WHERE 無し更新は禁止
- マイグレーション適用は `supabase migration up`。**データを初期化する `supabase db` のリセット系コマンドは絶対に実行しない**
- `npx supabase` ではなくグローバルの `supabase` を使う
- メイン領域レイアウトは**パターンB（フル幅型）**: `px-4 sm:px-6 lg:px-8 py-5 mx-auto w-full max-w-[1920px]`。`w-full` を `max-w-*` `mx-auto` より**先に**必ず書く
- ブランドカラーは `#FD7601`
- コミットは conventional commits（`feat:` / `fix:` / `test:` 等）

---

### Task 1: 依存追加と共通型定義

**Files:**

- Modify: `package.json`
- Create: `src/features/law-research/types.ts`

**Interfaces:**

- Consumes: なし
- Produces: `ResearchMode` / `ResearchSubTab` / `ResearchRef` / `ResearchHit` / `ResearchDocument` / `ResearchError` / `ResearchResult<T>` / `ResearchHistoryRow`

- [ ] **Step 1: 依存を完全固定バージョンで追加**

```bash
npm install --save-exact tax-law-mcp@0.5.4 labor-law-mcp@0.2.1
```

- [ ] **Step 2: deep import が実際に動くことを確認**

```bash
node --input-type=module -e "
const m = await import('labor-law-mcp/dist/lib/services/law-service.js')
const r = await m.getLawArticle({ lawName: '労働基準法', article: '32' })
console.log(r.lawTitle, r.article, r.text.slice(0, 30))
"
```

期待: `労働基準法 32 #### （労働時間）...` のように出力される。エラーになる場合はここで停止して報告する。

- [ ] **Step 3: 共通型を作成**

`src/features/law-research/types.ts`:

```typescript
/** 調べる機能の3モード */
export type ResearchMode = 'tax' | 'labor' | 'law'

/** モード内のサブタブ */
export type ResearchSubTab =
  // 税法モード
  | 'tax_article'
  | 'tax_tsutatsu'
  | 'tax_saiketsu'
  // 労務法モード
  | 'labor_article'
  | 'labor_mhlw'
  | 'labor_jaish'
  // 法令モード
  | 'law_search'
  | 'law_article'
  | 'law_revision'

/**
 * 原文取得に必要なパラメータ。
 * 一覧の行から詳細取得を呼ぶときに Server Action へ渡す。
 * Server Actions の境界を越えるためプレーンオブジェクトのみで構成する。
 */
export type ResearchRef =
  | { kind: 'law_article'; lawName: string; article: string }
  | { kind: 'law_toc'; lawName: string }
  | { kind: 'mhlw_tsutatsu'; dataId: string }
  | { kind: 'jaish_tsutatsu'; url: string }
  | { kind: 'tax_tsutatsu'; tsutatsuName: string; number: string }
  | { kind: 'tax_tsutatsu_toc'; tsutatsuName: string }
  | { kind: 'saiketsu'; url: string }

/** 検索結果1件（一覧表示用） */
export type ResearchHit = {
  /** DataTable の行キー。検索結果内で一意 */
  id: string
  /** 表示タイトル */
  title: string
  /** 通達番号・法令番号など。無ければ空文字 */
  identifier: string
  /** 日付表記。原文の表記をそのまま使う。無ければ空文字 */
  dateLabel: string
  /** 要旨・抜粋。無ければ空文字 */
  summary: string
  /** 原文取得用のパラメータ */
  ref: ResearchRef
  /** 出典サイト上の原文ページURL */
  sourceUrl: string
}

/** 原文全文（詳細パネル表示用） */
export type ResearchDocument = {
  title: string
  /** 通達番号・条番号など。無ければ空文字 */
  identifier: string
  /** 本文（Markdown 相当のプレーンテキスト） */
  body: string
  /** 出典URL */
  sourceUrl: string
  /** 取得時刻（ISO8601） */
  fetchedAt: string
}

/** 失敗の分類。UI の出し分けに使う */
export type ResearchErrorKind = 'timeout' | 'upstream' | 'not_found' | 'invalid_input'

export type ResearchError = {
  kind: ResearchErrorKind
  /** ユーザーにそのまま見せる日本語メッセージ */
  message: string
  /** 出典サイトへ直接飛ばすためのURL（分かる場合） */
  sourceUrl?: string
}

/** Server Actions の戻り値。例外を投げずに必ずこの形で返す */
export type ResearchResult<T> = { ok: true; data: T } | { ok: false; error: ResearchError }

/** 検索履歴の1行 */
export type ResearchHistoryRow = {
  id: string
  mode: ResearchMode
  sub_tab: ResearchSubTab
  keyword: string
  result_count: number
  created_at: string
}
```

- [ ] **Step 4: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add package.json package-lock.json src/features/law-research/types.ts
git commit -m "feat: 調べる機能の共通型と法令MCPパッケージ依存を追加"
```

---

### Task 2: 正規化関数（normalize.ts）

外部パッケージの戻り値を `ResearchHit` / `ResearchDocument` へ写像する純粋関数。外部パッケージの型に依存させず、**構造的に最小限の入力型**を自前で定義してテスト可能にする。

**Files:**

- Create: `src/features/law-research/lib/normalize.ts`
- Test: `src/features/law-research/lib/normalize.test.ts`

**Interfaces:**

- Consumes: `ResearchHit` / `ResearchDocument`（Task 1）
- Produces: `toSearchLawHits` / `toMhlwHits` / `toJaishHits` / `toSaiketsuHits` / `toLawArticleDocument` / `toMhlwDocument` / `toJaishDocument` / `toTaxTsutatsuDocument` / `toSaiketsuDocument` / `JAISH_BASE_URL` / `resolveJaishUrl`

- [ ] **Step 1: 失敗するテストを書く**

`src/features/law-research/lib/normalize.test.ts`:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  JAISH_BASE_URL,
  resolveJaishUrl,
  toJaishHits,
  toLawArticleDocument,
  toMhlwDocument,
  toMhlwHits,
  toSaiketsuHits,
  toSearchLawHits,
} from './normalize'

test('toSearchLawHits: e-Gov 検索結果を ResearchHit へ写像する', () => {
  const hits = toSearchLawHits({
    results: [
      {
        lawTitle: '労働基準法',
        lawId: '322AC0000000049',
        lawNum: '昭和二十二年法律第四十九号',
        lawType: 'Act',
        egovUrl: 'https://laws.e-gov.go.jp/law/322AC0000000049',
      },
    ],
  })

  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, '322AC0000000049')
  assert.equal(hits[0].title, '労働基準法')
  assert.equal(hits[0].identifier, '昭和二十二年法律第四十九号')
  assert.equal(hits[0].sourceUrl, 'https://laws.e-gov.go.jp/law/322AC0000000049')
  assert.deepEqual(hits[0].ref, { kind: 'law_toc', lawName: '労働基準法' })
})

test('toMhlwHits: 厚労省通達の検索結果を写像し、番号と日付を保持する', () => {
  const hits = toMhlwHits({
    results: [
      {
        title: '賃金不払残業の解消を図るために講ずべき措置等に関する指針について',
        dataId: '00tb2035',
        date: '平成15年05月23日',
        shubetsu: '基発第523004号',
      },
    ],
  })

  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, '00tb2035')
  assert.equal(hits[0].identifier, '基発第523004号')
  assert.equal(hits[0].dateLabel, '平成15年05月23日')
  assert.deepEqual(hits[0].ref, { kind: 'mhlw_tsutatsu', dataId: '00tb2035' })
})

test('resolveJaishUrl: 相対パスを絶対URLへ変換し、絶対URLはそのまま返す', () => {
  assert.equal(
    resolveJaishUrl('/anzen/hor/hombun/x.htm'),
    `${JAISH_BASE_URL}/anzen/hor/hombun/x.htm`
  )
  assert.equal(resolveJaishUrl('https://example.test/a.htm'), 'https://example.test/a.htm')
})

test('toJaishHits: 安衛通達の相対URLを絶対URLへ正規化する', () => {
  const hits = toJaishHits({
    results: [
      {
        title: 'ストレスチェック制度の施行を踏まえた当面のメンタルヘルス対策の推進について',
        number: '基発0331第31号',
        date: '令和4年3月31日',
        url: '/anzen/hor/hombun/hor1-63/hor1-63-1-1-0.htm',
      },
    ],
  })

  const expectedUrl = `${JAISH_BASE_URL}/anzen/hor/hombun/hor1-63/hor1-63-1-1-0.htm`
  assert.equal(hits.length, 1)
  assert.equal(hits[0].sourceUrl, expectedUrl)
  assert.deepEqual(hits[0].ref, { kind: 'jaish_tsutatsu', url: expectedUrl })
})

test('toSaiketsuHits: 裁決事例を写像し、要旨を summary に入れる', () => {
  const hits = toSaiketsuHits({
    results: [
      {
        collectionNo: 102,
        taxType: '所得税法関係',
        category: '（同業者率を用いた推計の合理性）',
        summary: '原処分庁が推計の基礎とした…',
        date: '令和7年4月11日',
        caseUrl: 'https://www.kfs.go.jp/service/JP/102/01/index.html',
      },
    ],
  })

  assert.equal(hits.length, 1)
  assert.equal(hits[0].title, '（同業者率を用いた推計の合理性）')
  assert.equal(hits[0].identifier, '裁決事例集 第102集 所得税法関係')
  assert.equal(hits[0].dateLabel, '令和7年4月11日')
  assert.match(hits[0].summary, /原処分庁/)
  assert.deepEqual(hits[0].ref, {
    kind: 'saiketsu',
    url: 'https://www.kfs.go.jp/service/JP/102/01/index.html',
  })
})

test('toLawArticleDocument: 条見出しがある場合はタイトルに含める', () => {
  const doc = toLawArticleDocument(
    {
      lawTitle: '労働基準法',
      article: '36',
      articleCaption: '（時間外及び休日の労働）',
      text: '#### （時間外及び休日の労働）\n**第三十六条**\n\n使用者は…',
      egovUrl: 'https://laws.e-gov.go.jp/law/322AC0000000049',
    },
    '2026-08-18T09:00:00.000Z'
  )

  assert.equal(doc.title, '労働基準法 第36条（時間外及び休日の労働）')
  assert.equal(doc.identifier, '第36条')
  assert.equal(doc.fetchedAt, '2026-08-18T09:00:00.000Z')
  assert.match(doc.body, /使用者は/)
})

test('toLawArticleDocument: 条見出しが空の場合はタイトルに括弧を付けない', () => {
  const doc = toLawArticleDocument(
    {
      lawTitle: '法人税法',
      article: '22',
      articleCaption: '',
      text: '**第二十二条**\n\n内国法人の…',
      egovUrl: 'https://laws.e-gov.go.jp/law/340AC0000000034',
    },
    '2026-08-18T09:00:00.000Z'
  )

  assert.equal(doc.title, '法人税法 第22条')
})

test('toMhlwDocument: 通達本文を ResearchDocument へ写像する', () => {
  const doc = toMhlwDocument(
    {
      title: '賃金不払残業の解消を図るために講ずべき措置等に関する指針について',
      body: '## 指針\n\n(平成15年5月23日)',
      dataId: '00tb2035',
      url: 'https://www.mhlw.go.jp/web/t_doc?dataId=00tb2035',
    },
    '2026-08-18T09:00:00.000Z'
  )

  assert.equal(doc.identifier, '00tb2035')
  assert.equal(doc.sourceUrl, 'https://www.mhlw.go.jp/web/t_doc?dataId=00tb2035')
  assert.equal(doc.fetchedAt, '2026-08-18T09:00:00.000Z')
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `node --import tsx --test src/features/law-research/lib/normalize.test.ts`
Expected: FAIL（`Cannot find module './normalize'`）

- [ ] **Step 3: 実装を書く**

`src/features/law-research/lib/normalize.ts`:

```typescript
import type { ResearchDocument, ResearchHit } from '../types'

/** JAISH（安全衛生情報センター）のベースURL。検索結果の url が相対パスで返るため補う */
export const JAISH_BASE_URL = 'https://www.jaish.gr.jp'

// --- 入力の構造型 ---------------------------------------------------------
// 外部パッケージの型に直接依存すると、パッケージ更新でテストまで壊れる。
// ここでは正規化に必要な最小限のフィールドだけを自前で定義する。

type SearchLawInput = {
  results: {
    lawTitle: string
    lawId: string
    lawNum: string
    lawType: string
    egovUrl: string
  }[]
}

type MhlwSearchInput = {
  results: { title: string; dataId: string; date: string; shubetsu: string }[]
}

type JaishSearchInput = {
  results: { title: string; number: string; date: string; url: string }[]
}

type SaiketsuSearchInput = {
  results: {
    collectionNo: number
    taxType: string
    category: string
    summary: string
    date: string
    caseUrl: string
  }[]
}

type LawArticleInput = {
  lawTitle: string
  article: string
  articleCaption: string
  text: string
  egovUrl: string
}

type MhlwDocumentInput = { title: string; body: string; dataId: string; url: string }

type JaishDocumentInput = { title: string; body: string; url: string }

type TaxTsutatsuInput = {
  tsutatsuName: string
  entry: { number: string; caption: string; body: string; url: string }
}

type SaiketsuFullTextInput = { fullText: { body: string; date: string; url: string } }

// --- URL 正規化 -----------------------------------------------------------

/** JAISH の相対パスを絶対URLへ変換する。既に絶対URLならそのまま返す */
export function resolveJaishUrl(url: string): string {
  if (!url) return JAISH_BASE_URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${JAISH_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

// --- 一覧（ResearchHit）---------------------------------------------------

/** e-Gov 法令検索の結果を一覧行へ写像する */
export function toSearchLawHits(input: SearchLawInput): ResearchHit[] {
  return input.results.map(r => ({
    id: r.lawId,
    title: r.lawTitle,
    identifier: r.lawNum,
    dateLabel: '',
    summary: '',
    ref: { kind: 'law_toc', lawName: r.lawTitle },
    sourceUrl: r.egovUrl,
  }))
}

/** 厚労省通達の検索結果を一覧行へ写像する */
export function toMhlwHits(input: MhlwSearchInput): ResearchHit[] {
  return input.results.map(r => ({
    id: r.dataId,
    title: r.title,
    identifier: r.shubetsu,
    dateLabel: r.date,
    summary: '',
    ref: { kind: 'mhlw_tsutatsu', dataId: r.dataId },
    sourceUrl: `https://www.mhlw.go.jp/web/t_doc?dataId=${encodeURIComponent(r.dataId)}`,
  }))
}

/** 安衛通達（JAISH）の検索結果を一覧行へ写像する */
export function toJaishHits(input: JaishSearchInput): ResearchHit[] {
  return input.results.map(r => {
    const absoluteUrl = resolveJaishUrl(r.url)
    return {
      id: absoluteUrl,
      title: r.title,
      identifier: r.number,
      dateLabel: r.date,
      summary: '',
      ref: { kind: 'jaish_tsutatsu', url: absoluteUrl },
      sourceUrl: absoluteUrl,
    }
  })
}

/** 裁決事例の検索結果を一覧行へ写像する */
export function toSaiketsuHits(input: SaiketsuSearchInput): ResearchHit[] {
  return input.results.map(r => ({
    id: r.caseUrl,
    title: r.category,
    identifier: `裁決事例集 第${r.collectionNo}集 ${r.taxType}`,
    dateLabel: r.date,
    summary: r.summary,
    ref: { kind: 'saiketsu', url: r.caseUrl },
    sourceUrl: r.caseUrl,
  }))
}

// --- 詳細（ResearchDocument）----------------------------------------------

/** 条文をドキュメントへ写像する。条見出しがあればタイトルに含める */
export function toLawArticleDocument(input: LawArticleInput, fetchedAt: string): ResearchDocument {
  const identifier = `第${input.article}条`
  const caption = input.articleCaption ? input.articleCaption : ''
  return {
    title: `${input.lawTitle} ${identifier}${caption}`,
    identifier,
    body: input.text,
    sourceUrl: input.egovUrl,
    fetchedAt,
  }
}

/** 厚労省通達本文をドキュメントへ写像する */
export function toMhlwDocument(input: MhlwDocumentInput, fetchedAt: string): ResearchDocument {
  return {
    title: input.title,
    identifier: input.dataId,
    body: input.body,
    sourceUrl: input.url,
    fetchedAt,
  }
}

/** 安衛通達本文をドキュメントへ写像する */
export function toJaishDocument(input: JaishDocumentInput, fetchedAt: string): ResearchDocument {
  return {
    title: input.title,
    identifier: '',
    body: input.body,
    sourceUrl: resolveJaishUrl(input.url),
    fetchedAt,
  }
}

/** 国税庁通達をドキュメントへ写像する */
export function toTaxTsutatsuDocument(
  input: TaxTsutatsuInput,
  fetchedAt: string
): ResearchDocument {
  return {
    title: `${input.tsutatsuName} ${input.entry.number} ${input.entry.caption}`.trim(),
    identifier: input.entry.number,
    body: input.entry.body,
    sourceUrl: input.entry.url,
    fetchedAt,
  }
}

/** 裁決事例の全文をドキュメントへ写像する */
export function toSaiketsuDocument(
  input: SaiketsuFullTextInput,
  fetchedAt: string
): ResearchDocument {
  return {
    title: `裁決事例（${input.fullText.date}）`,
    identifier: input.fullText.date,
    body: input.fullText.body,
    sourceUrl: input.fullText.url,
    fetchedAt,
  }
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `node --import tsx --test src/features/law-research/lib/normalize.test.ts`
Expected: PASS（8 tests）

- [ ] **Step 5: コミット**

```bash
git add src/features/law-research/lib/normalize.ts src/features/law-research/lib/normalize.test.ts
git commit -m "feat: 調べる機能の検索結果・原文の正規化関数を追加"
```

---

### Task 3: 外部呼び出しラッパ（external-call.ts）

外部サイト呼び出しの共通処理（タイムアウト・エラー分類・ログ）を1か所に集約する。**依存注入で単体テスト可能にする**（実通信しない）。

**Files:**

- Create: `src/features/law-research/lib/external-call.ts`
- Test: `src/features/law-research/lib/external-call.test.ts`

**Interfaces:**

- Consumes: `ResearchError` / `ResearchResult`（Task 1）
- Produces: `callExternal<T>(label: string, fn: () => Promise<T>, opts?: { timeoutMs?: number; sourceUrl?: string }): Promise<ResearchResult<T>>` / `EXTERNAL_TIMEOUT_MS`

- [ ] **Step 1: 失敗するテストを書く**

`src/features/law-research/lib/external-call.test.ts`:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import { callExternal, EXTERNAL_TIMEOUT_MS } from './external-call'

test('EXTERNAL_TIMEOUT_MS: 実測最遅1.4秒に対して十分な余裕がある', () => {
  assert.ok(EXTERNAL_TIMEOUT_MS >= 8000)
})

test('callExternal: 成功時は ok:true でデータを返す', async () => {
  const result = await callExternal('テスト', async () => ({ value: 1 }))
  assert.equal(result.ok, true)
  if (result.ok) assert.deepEqual(result.data, { value: 1 })
})

test('callExternal: 例外時は ok:false で upstream エラーを返し、例外を投げない', async t => {
  t.mock.method(console, 'error', () => {})

  const result = await callExternal(
    '厚労省通達検索',
    async () => {
      throw new Error('HTTP 503')
    },
    { sourceUrl: 'https://www.mhlw.go.jp/' }
  )

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.kind, 'upstream')
    assert.match(result.error.message, /厚労省通達検索/)
    assert.equal(result.error.sourceUrl, 'https://www.mhlw.go.jp/')
  }
})

test('callExternal: タイムアウト時は timeout エラーを返す', async t => {
  t.mock.method(console, 'error', () => {})

  const result = await callExternal(
    '安衛通達検索',
    () => new Promise(resolve => setTimeout(() => resolve('遅い'), 50)),
    { timeoutMs: 10 }
  )

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.kind, 'timeout')
    assert.match(result.error.message, /時間内に取得できませんでした/)
  }
})

test('callExternal: 失敗はサーバー側ログに出力される（握り潰さない）', async t => {
  let logged = false
  t.mock.method(console, 'error', () => {
    logged = true
  })

  await callExternal('テスト', async () => {
    throw new Error('boom')
  })

  assert.equal(logged, true)
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `node --import tsx --test src/features/law-research/lib/external-call.test.ts`
Expected: FAIL（`Cannot find module './external-call'`）

- [ ] **Step 3: 実装を書く**

`src/features/law-research/lib/external-call.ts`:

```typescript
import type { ResearchResult } from '../types'

/**
 * 外部サイト呼び出しのタイムアウト。
 * 実測の最遅は JAISH 検索・裁決事例検索の約 1.4 秒（2026-08-18 計測）。
 * 外部サイトの一時的な遅延を許容しつつ、ユーザーを待たせすぎない値として 12 秒。
 */
export const EXTERNAL_TIMEOUT_MS = 12000

/** タイムアウト検出用の内部エラー */
class ExternalTimeoutError extends Error {}

/**
 * 外部サイト（e-Gov / 厚労省 / JAISH / 国税庁 / 国税不服審判所）への呼び出しを包む。
 *
 * - 例外を外へ投げず、必ず ResearchResult を返す
 * - 失敗は必ずサーバー側ログに残す（無言で握り潰さない）
 * - 失敗時も sourceUrl を返し、UI から出典サイトへ直接飛べるようにする
 */
export async function callExternal<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { timeoutMs?: number; sourceUrl?: string } = {}
): Promise<ResearchResult<T>> {
  const timeoutMs = opts.timeoutMs ?? EXTERNAL_TIMEOUT_MS
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const data = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ExternalTimeoutError()), timeoutMs)
      }),
    ])
    return { ok: true, data }
  } catch (e) {
    if (e instanceof ExternalTimeoutError) {
      console.error(`[law-research] timeout: ${label} (${timeoutMs}ms)`)
      return {
        ok: false,
        error: {
          kind: 'timeout',
          message: `${label}を時間内に取得できませんでした。時間をおいて再度お試しください。`,
          sourceUrl: opts.sourceUrl,
        },
      }
    }

    console.error(`[law-research] upstream error: ${label}`, e)
    return {
      ok: false,
      error: {
        kind: 'upstream',
        message: `${label}を取得できませんでした。出典サイトが一時的に利用できないか、ページ構成が変更された可能性があります。`,
        sourceUrl: opts.sourceUrl,
      },
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `node --import tsx --test src/features/law-research/lib/external-call.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: コミット**

```bash
git add src/features/law-research/lib/external-call.ts src/features/law-research/lib/external-call.test.ts
git commit -m "feat: 調べる機能の外部呼び出しラッパ（タイムアウト・エラー分類）を追加"
```

---

### Task 4: 改正履歴クライアント（egov-revision.ts）

`hourei-mcp-server` を採用しない代替。e-Gov 法令API **v2** の `law_revisions` を直接叩く。

**Files:**

- Create: `src/features/law-research/lib/egov-revision.ts`
- Test: `src/features/law-research/lib/egov-revision.test.ts`

**Interfaces:**

- Consumes: `ResearchHit`（Task 1）
- Produces: `EGOV_API_V2_BASE` / `fetchLawRevisions(lawId: string): Promise<ResearchHit[]>`

- [ ] **Step 1: 失敗するテストを書く**

`src/features/law-research/lib/egov-revision.test.ts`:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import { EGOV_API_V2_BASE, fetchLawRevisions } from './egov-revision'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const SAMPLE = {
  law_info: {
    law_id: '322AC0000000049',
    law_num: '昭和二十二年法律第四十九号',
    promulgation_date: '1947-04-07',
  },
  revisions: [
    {
      law_revision_id: '322AC0000000049_20281223_508AC0000000046',
      law_title: '労働基準法',
      abbrev: '労基法',
      amendment_promulgate_date: '2026-06-12',
      amendment_law_num: '令和八年法律第四十六号',
    },
  ],
}

test('fetchLawRevisions: v2 の law_revisions エンドポイントを law_id で叩く', async t => {
  let calledUrl = ''
  t.mock.method(globalThis, 'fetch', async (url: string | URL) => {
    calledUrl = url.toString()
    return jsonResponse(200, SAMPLE)
  })

  await fetchLawRevisions('322AC0000000049')
  assert.equal(calledUrl, `${EGOV_API_V2_BASE}/law_revisions/322AC0000000049`)
})

test('fetchLawRevisions: 改正履歴を ResearchHit へ写像する', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(200, SAMPLE))

  const hits = await fetchLawRevisions('322AC0000000049')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, '322AC0000000049_20281223_508AC0000000046')
  assert.equal(hits[0].title, '労働基準法')
  assert.equal(hits[0].identifier, '令和八年法律第四十六号')
  assert.equal(hits[0].dateLabel, '2026-06-12')
  assert.equal(hits[0].sourceUrl, 'https://laws.e-gov.go.jp/law/322AC0000000049')
  assert.deepEqual(hits[0].ref, { kind: 'law_toc', lawName: '労働基準法' })
})

test('fetchLawRevisions: revisions が無い場合は空配列を返す', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(200, { law_info: SAMPLE.law_info }))

  const hits = await fetchLawRevisions('322AC0000000049')
  assert.deepEqual(hits, [])
})

test('fetchLawRevisions: 非200は例外を投げる（callExternal 側で分類させる）', async t => {
  t.mock.method(globalThis, 'fetch', async () => jsonResponse(500, {}))

  await assert.rejects(() => fetchLawRevisions('322AC0000000049'), /500/)
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `node --import tsx --test src/features/law-research/lib/egov-revision.test.ts`
Expected: FAIL（`Cannot find module './egov-revision'`）

- [ ] **Step 3: 実装を書く**

`src/features/law-research/lib/egov-revision.ts`:

```typescript
import type { ResearchHit } from '../types'

/**
 * e-Gov 法令API v2 のベースURL。
 * hourei-mcp-server は v1（https://laws.e-gov.go.jp/api/1）を使っているが、
 * tax-law-mcp / labor-law-mcp が v2 を使うため、API 世代を v2 に統一する。
 */
export const EGOV_API_V2_BASE = 'https://laws.e-gov.go.jp/api/2'

/** e-Gov 法令ページのURLを law_id から組み立てる */
function egovLawUrl(lawId: string): string {
  return `https://laws.e-gov.go.jp/law/${lawId}`
}

type RevisionEntry = {
  law_revision_id?: string
  law_title?: string
  abbrev?: string
  amendment_promulgate_date?: string
  amendment_law_num?: string
}

type LawRevisionsResponse = {
  law_info?: { law_id?: string; law_num?: string; promulgation_date?: string }
  revisions?: RevisionEntry[]
}

/**
 * 法令の改正履歴を取得する。
 * 失敗時は例外を投げる。分類とユーザー向けメッセージ化は callExternal に任せる。
 */
export async function fetchLawRevisions(lawId: string): Promise<ResearchHit[]> {
  const res = await fetch(`${EGOV_API_V2_BASE}/law_revisions/${lawId}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`e-Gov law_revisions が ${res.status} を返しました`)
  }

  const json = (await res.json()) as LawRevisionsResponse
  const revisions = json.revisions ?? []
  const sourceUrl = egovLawUrl(lawId)

  return revisions.map((r, i) => {
    const title = r.law_title ?? ''
    return {
      id: r.law_revision_id ?? `${lawId}-${i}`,
      title,
      identifier: r.amendment_law_num ?? '',
      dateLabel: r.amendment_promulgate_date ?? '',
      summary: r.abbrev ? `略称: ${r.abbrev}` : '',
      ref: { kind: 'law_toc', lawName: title },
      sourceUrl,
    }
  })
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `node --import tsx --test src/features/law-research/lib/egov-revision.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: コミット**

```bash
git add src/features/law-research/lib/egov-revision.ts src/features/law-research/lib/egov-revision.test.ts
git commit -m "feat: e-Gov v2 の法令改正履歴クライアントを追加"
```

---

### Task 5: 外部パッケージのアダプタ（labor-law-client.ts / tax-law-client.ts）

deep import を**この2ファイルだけに閉じ込める**。パッケージが破壊的変更を入れた場合の修正範囲をここに限定するのが目的。

**Files:**

- Create: `src/features/law-research/lib/labor-law-client.ts`
- Create: `src/features/law-research/lib/tax-law-client.ts`
- Create: `scripts/smoke_law_research.ts`
- Modify: `package.json`（`scripts` に `smoke:law-research` を追加）

**Interfaces:**

- Consumes: `callExternal`（Task 3）、`normalize.ts` の各関数（Task 2）、`ResearchResult` / `ResearchHit` / `ResearchDocument`（Task 1）
- Produces:
  - `laborSearchLaw(keyword: string): Promise<ResearchResult<ResearchHit[]>>`
  - `laborGetLawArticle(lawName: string, article: string): Promise<ResearchResult<ResearchDocument>>`
  - `laborGetLawToc(lawName: string): Promise<ResearchResult<ResearchDocument>>`
  - `laborSearchMhlw(keyword: string): Promise<ResearchResult<ResearchHit[]>>`
  - `laborGetMhlw(dataId: string): Promise<ResearchResult<ResearchDocument>>`
  - `laborSearchJaish(keyword: string): Promise<ResearchResult<ResearchHit[]>>`
  - `laborGetJaish(url: string): Promise<ResearchResult<ResearchDocument>>`
  - `taxGetLawArticle(lawName: string, article: string): Promise<ResearchResult<ResearchDocument>>`
  - `taxListTsutatsuToc(tsutatsuName: string): Promise<ResearchResult<ResearchDocument>>`
  - `taxGetTsutatsu(tsutatsuName: string, num: string): Promise<ResearchResult<ResearchDocument>>`
  - `taxSearchSaiketsu(keyword: string): Promise<ResearchResult<ResearchHit[]>>`
  - `taxGetSaiketsu(url: string): Promise<ResearchResult<ResearchDocument>>`

- [ ] **Step 1: 労務法アダプタを書く**

`src/features/law-research/lib/labor-law-client.ts`:

```typescript
// labor-law-mcp のサービス層を直接 import する。
// このパッケージは package.json に exports マップを持たず files: ["dist/**/*"] で
// 全ファイルを同梱しているため、サブパス import が成立する。
// MCP プロトコル（stdio 子プロセス）は Vercel のサーバーレスで使えないため採用しない。
// 内部パス依存になるので package.json でバージョンを完全固定している（0.2.1）。
import { getLawArticle, getLawToc, searchLaw } from 'labor-law-mcp/dist/lib/services/law-service.js'
import {
  getMhlwTsutatsu,
  searchMhlwTsutatsu,
} from 'labor-law-mcp/dist/lib/services/mhlw-tsutatsu-service.js'
import {
  getJaishTsutatsu,
  searchJaishTsutatsu,
} from 'labor-law-mcp/dist/lib/services/jaish-tsutatsu-service.js'

import type { ResearchDocument, ResearchHit, ResearchResult } from '../types'
import { callExternal } from './external-call'
import {
  JAISH_BASE_URL,
  toJaishDocument,
  toJaishHits,
  toLawArticleDocument,
  toMhlwDocument,
  toMhlwHits,
  toSearchLawHits,
} from './normalize'

const EGOV_SITE = 'https://laws.e-gov.go.jp/'
const MHLW_SITE = 'https://www.mhlw.go.jp/hourei/'

/** 法令をキーワード検索する */
export function laborSearchLaw(keyword: string): Promise<ResearchResult<ResearchHit[]>> {
  return callExternal(
    '法令の検索結果',
    async () => toSearchLawHits(await searchLaw({ keyword, limit: 20 })),
    { sourceUrl: EGOV_SITE }
  )
}

/** 法令の特定条文を取得する */
export function laborGetLawArticle(
  lawName: string,
  article: string
): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${lawName} 第${article}条`,
    async () =>
      toLawArticleDocument(await getLawArticle({ lawName, article }), new Date().toISOString()),
    { sourceUrl: EGOV_SITE }
  )
}

/** 法令の目次を取得する */
export function laborGetLawToc(lawName: string): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${lawName} の目次`,
    async () => {
      const r = await getLawToc({ lawName })
      return {
        title: `${r.lawTitle} 目次`,
        identifier: '',
        body: r.toc,
        sourceUrl: r.egovUrl,
        fetchedAt: new Date().toISOString(),
      }
    },
    { sourceUrl: EGOV_SITE }
  )
}

/** 厚労省通達をキーワード検索する */
export function laborSearchMhlw(keyword: string): Promise<ResearchResult<ResearchHit[]>> {
  return callExternal(
    '厚労省通達の検索結果',
    async () => toMhlwHits(await searchMhlwTsutatsu({ keyword })),
    { sourceUrl: MHLW_SITE }
  )
}

/** 厚労省通達の本文を取得する */
export function laborGetMhlw(dataId: string): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    '厚労省通達の本文',
    async () => toMhlwDocument(await getMhlwTsutatsu({ dataId }), new Date().toISOString()),
    { sourceUrl: MHLW_SITE }
  )
}

/** 安衛通達（JAISH）をキーワード検索する */
export function laborSearchJaish(keyword: string): Promise<ResearchResult<ResearchHit[]>> {
  return callExternal(
    '安衛通達の検索結果',
    async () => toJaishHits(await searchJaishTsutatsu({ keyword, limit: 20 })),
    { sourceUrl: JAISH_BASE_URL }
  )
}

/** 安衛通達（JAISH）の本文を取得する */
export function laborGetJaish(url: string): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    '安衛通達の本文',
    async () => toJaishDocument(await getJaishTsutatsu({ url }), new Date().toISOString()),
    { sourceUrl: url }
  )
}
```

- [ ] **Step 2: 税法アダプタを書く**

`src/features/law-research/lib/tax-law-client.ts`:

```typescript
// tax-law-mcp のサービス層を直接 import する。理由は labor-law-client.ts のコメント参照。
// バージョンは package.json で完全固定している（0.5.4）。
import { getLawArticle } from 'tax-law-mcp/dist/lib/services/law-service.js'
import { getTsutatsu, listTsutatsuToc } from 'tax-law-mcp/dist/lib/services/tsutatsu-service.js'
import { getSaiketsu, searchSaiketsu } from 'tax-law-mcp/dist/lib/services/saiketsu-service.js'

import type { ResearchDocument, ResearchHit, ResearchResult } from '../types'
import { callExternal } from './external-call'
import {
  toLawArticleDocument,
  toSaiketsuDocument,
  toSaiketsuHits,
  toTaxTsutatsuDocument,
} from './normalize'

const EGOV_SITE = 'https://laws.e-gov.go.jp/'
const NTA_SITE = 'https://www.nta.go.jp/law/tsutatsu/kihon/'
const KFS_SITE = 'https://www.kfs.go.jp/service/'

/** 税法の特定条文を取得する */
export function taxGetLawArticle(
  lawName: string,
  article: string
): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${lawName} 第${article}条`,
    async () =>
      toLawArticleDocument(await getLawArticle({ lawName, article }), new Date().toISOString()),
    { sourceUrl: EGOV_SITE }
  )
}

/** 国税庁通達の目次を取得する */
export function taxListTsutatsuToc(
  tsutatsuName: string
): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${tsutatsuName} の目次`,
    async () => {
      const r = await listTsutatsuToc({ tsutatsuName })
      return {
        title: `${r.tsutatsuName} 目次`,
        identifier: '',
        body: r.tocText,
        sourceUrl: r.tocUrl,
        fetchedAt: new Date().toISOString(),
      }
    },
    { sourceUrl: NTA_SITE }
  )
}

/** 国税庁通達の特定エントリを取得する */
export function taxGetTsutatsu(
  tsutatsuName: string,
  num: string
): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${tsutatsuName} ${num}`,
    async () =>
      toTaxTsutatsuDocument(
        await getTsutatsu({ tsutatsuName, number: num }),
        new Date().toISOString()
      ),
    { sourceUrl: NTA_SITE }
  )
}

/** 裁決事例をキーワード検索する */
export function taxSearchSaiketsu(keyword: string): Promise<ResearchResult<ResearchHit[]>> {
  return callExternal(
    '裁決事例の検索結果',
    async () => toSaiketsuHits(await searchSaiketsu({ keyword, limit: 20 })),
    { sourceUrl: KFS_SITE }
  )
}

/** 裁決事例の全文を取得する */
export function taxGetSaiketsu(url: string): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    '裁決事例の全文',
    async () => toSaiketsuDocument(await getSaiketsu({ url }), new Date().toISOString()),
    { sourceUrl: url }
  )
}
```

- [ ] **Step 3: スモークスクリプトを書く**

外部サイトへの実通信は CI に入れない（国税庁・JAISH はスクレイピング依存で不安定なため）。代わりに手動実行するスモークを用意する。

`scripts/smoke_law_research.ts`:

```typescript
/**
 * 「調べる」機能の外部サイト疎通スモークテスト。
 * 実通信するため CI には入れない。手動で `npm run smoke:law-research` を実行する。
 * 外部サイトの HTML 構造変更を早期に検知するのが目的。
 */
import {
  laborGetLawArticle,
  laborGetMhlw,
  laborSearchJaish,
  laborSearchLaw,
  laborSearchMhlw,
} from '../src/features/law-research/lib/labor-law-client'
import {
  taxGetLawArticle,
  taxSearchSaiketsu,
} from '../src/features/law-research/lib/tax-law-client'
import { fetchLawRevisions } from '../src/features/law-research/lib/egov-revision'

async function check(label: string, run: () => Promise<{ ok: boolean }>) {
  const started = Date.now()
  const result = await run()
  const ms = Date.now() - started
  console.log(`${result.ok ? 'OK  ' : 'FAIL'} ${label} (${ms}ms)`)
  return result.ok
}

async function main() {
  const results = [
    await check('労基法36条', () => laborGetLawArticle('労働基準法', '36')),
    await check('法令検索（育児）', () => laborSearchLaw('育児')),
    await check('厚労省通達検索（36協定）', () => laborSearchMhlw('36協定')),
    await check('厚労省通達本文（00tb2035）', () => laborGetMhlw('00tb2035')),
    await check('安衛通達検索（ストレスチェック）', () => laborSearchJaish('ストレスチェック')),
    await check('法人税法22条', () => taxGetLawArticle('法人税法', '22')),
    await check('裁決事例検索（交際費）', () => taxSearchSaiketsu('交際費')),
    await check('改正履歴（労基法）', async () => {
      // fetchLawRevisions は callExternal を通さず例外を投げる仕様のため、
      // ここで捕捉して他項目と同じ {ok} 形式に揃える（クラッシュさせない）
      try {
        const hits = await fetchLawRevisions('322AC0000000049')
        return { ok: hits.length > 0 }
      } catch (e) {
        console.error('  改正履歴の取得で例外:', e instanceof Error ? e.message : e)
        return { ok: false }
      }
    }),
  ]

  const failed = results.filter(ok => !ok).length
  if (failed > 0) {
    console.error(`\n${failed} 件が失敗しました。出典サイトの構成変更を確認してください。`)
    process.exit(1)
  }
  console.log('\nすべて疎通しました。')
}

main()
```

- [ ] **Step 4: package.json に smoke スクリプトを追加**

`package.json` の `scripts` に以下を追加する:

```json
"smoke:law-research": "tsx scripts/smoke_law_research.ts"
```

- [ ] **Step 5: 型チェックとスモークを実行**

```bash
npm run type-check
npm run smoke:law-research
```

Expected: 型エラーなし。スモークは8項目すべて `OK`。失敗した項目があればここで停止して報告する（外部サイト側の変更の可能性）。

- [ ] **Step 6: コミット**

```bash
git add src/features/law-research/lib/labor-law-client.ts src/features/law-research/lib/tax-law-client.ts scripts/smoke_law_research.ts package.json
git commit -m "feat: 法令MCPパッケージのアダプタと疎通スモークを追加"
```

---

### Task 6: 検索履歴テーブルのマイグレーション

**Files:**

- Create: `supabase/migrations/<タイムスタンプ>_tenant_research_queries.sql`

**Interfaces:**

- Consumes: なし
- Produces: テーブル `public.tenant_research_queries`（列: `id` / `tenant_id` / `employee_id` / `mode` / `sub_tab` / `keyword` / `result_count` / `created_at`）

- [ ] **Step 1: マイグレーションファイルを作成**

```bash
supabase migration new tenant_research_queries
```

生成されたファイルに以下を書く:

```sql
-- =============================================================================
-- 「調べる」機能の検索履歴
--
-- /adm/research でのキーワード検索を記録し、履歴からの再実行を可能にする。
-- 取得した法令・通達の本文は保存しない（常に一次情報を取りに行き、
-- 古いキャッシュを見せないため）。記録するのは検索条件と件数のみ。
--
-- tenant_id は ON DELETE CASCADE。テナント削除時の取り残しを防ぐ。
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_research_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('tax', 'labor', 'law')),
  sub_tab TEXT NOT NULL,
  keyword TEXT NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_research_queries IS '「調べる」機能の検索履歴（検索条件のみ。原文は保存しない）';

CREATE INDEX IF NOT EXISTS idx_tenant_research_queries_tenant_created
  ON public.tenant_research_queries (tenant_id, created_at DESC);

ALTER TABLE public.tenant_research_queries ENABLE ROW LEVEL SECURITY;

-- テナント分離は既存ヘルパー current_tenant_id() を使う。
-- この関数は STABLE SECURITY DEFINER + SET search_path = public で定義されており、
-- 中身は「employees から user_id = auth.uid() の tenant_id を1件引く」。
-- SECURITY DEFINER のため employees 自身の RLS に対する再帰を避けられ、
-- STABLE のためプランナが結果をキャッシュできる。
-- 本DBのポリシーは 289件がこのヘルパー、91件が生のサブクエリを使っており、ヘルパーが現行の主流。
CREATE POLICY "tenant_isolation" ON public.tenant_research_queries
  FOR ALL USING (tenant_id = public.current_tenant_id());
```

> **注意: `employees` のカラム名は `user_id` であり `auth_user_id` ではない。** プロジェクトの CLAUDE.md にあるマイグレーションテンプレートは `auth_user_id` と書いているが、これは実スキーマと合っていない（実際に本タスクで適用エラーになった）。生のサブクエリを書く場合は `WHERE user_id = auth.uid()` とすること。

> ポリシーは新規テーブルへの初回作成なので `CREATE POLICY` のみで足りる。再実行が必要になった場合も、テーブルが `IF NOT EXISTS` で守られているため、このマイグレーション自体を再適用することはない。

- [ ] **Step 2: ローカルに適用**

```bash
supabase migration up
```

Expected: 新規マイグレーションのみが適用される。**データを初期化するリセット系コマンドは絶対に実行しない。**

- [ ] **Step 3: テーブルと RLS を確認**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:55422/postgres" -c "\d public.tenant_research_queries"
psql "postgresql://postgres:postgres@127.0.0.1:55422/postgres" -c "SELECT relrowsecurity FROM pg_class WHERE relname = 'tenant_research_queries';"
```

Expected: 8列が存在し、`relrowsecurity` が `t`

- [ ] **Step 4: 型定義を再生成**

```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/ src/lib/supabase/types.ts
git commit -m "feat: 調べる機能の検索履歴テーブルを追加"
```

---

### Task 7: queries.ts と検索系 Server Actions

**Files:**

- Create: `src/features/law-research/queries.ts`
- Create: `src/features/law-research/actions.ts`

**Interfaces:**

- Consumes: Task 5 の全アダプタ、`fetchLawRevisions`（Task 4）、`callExternal`（Task 3）、Task 1 の型
- Produces:
  - `listResearchHistory(limit?: number): Promise<ResearchHistoryRow[]>`（queries.ts）
  - `runResearchSearch(input: { mode: ResearchMode; subTab: ResearchSubTab; keyword: string; article?: string }): Promise<ResearchResult<ResearchHit[]>>`（actions.ts）
  - `fetchResearchDocument(ref: ResearchRef): Promise<ResearchResult<ResearchDocument>>`（actions.ts）

- [ ] **Step 1: queries.ts を書く**

`src/features/law-research/queries.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { ResearchHistoryRow } from './types'

/** 検索履歴の既定取得件数 */
const DEFAULT_HISTORY_LIMIT = 20

/**
 * 自テナントの検索履歴を新しい順に取得する。
 * RLS でテナント分離されるが、追加の tenant_id 条件を保険として付ける。
 */
export async function listResearchHistory(
  limit: number = DEFAULT_HISTORY_LIMIT
): Promise<ResearchHistoryRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_research_queries')
    .select('id, mode, sub_tab, keyword, result_count, created_at')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[law-research] listResearchHistory', error)
    return []
  }

  return (data ?? []) as ResearchHistoryRow[]
}
```

- [ ] **Step 2: actions.ts を書く**

`src/features/law-research/actions.ts`:

```typescript
'use server'

import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'

import { fetchLawRevisions } from './lib/egov-revision'
import { callExternal } from './lib/external-call'
import {
  laborGetJaish,
  laborGetLawArticle,
  laborGetLawToc,
  laborGetMhlw,
  laborSearchJaish,
  laborSearchLaw,
  laborSearchMhlw,
} from './lib/labor-law-client'
import {
  taxGetSaiketsu,
  taxGetTsutatsu,
  taxListTsutatsuToc,
  taxSearchSaiketsu,
} from './lib/tax-law-client'
import type {
  ResearchDocument,
  ResearchHit,
  ResearchMode,
  ResearchRef,
  ResearchResult,
  ResearchSubTab,
} from './types'

/** 未ログイン時に返す共通エラー */
const UNAUTHORIZED: ResearchResult<never> = {
  ok: false,
  error: { kind: 'invalid_input', message: 'ログイン情報が無効です。再度ログインしてください。' },
}

const EGOV_SITE = 'https://laws.e-gov.go.jp/'
const NTA_SITE = 'https://www.nta.go.jp/law/tsutatsu/kihon/'

/**
 * 検索履歴を記録する。
 * 履歴の記録失敗で検索結果そのものを失わせないため、失敗してもログのみ残して続行する。
 */
async function recordHistory(input: {
  tenantId: string
  employeeId: string | null
  mode: ResearchMode
  subTab: ResearchSubTab
  keyword: string
  resultCount: number
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('tenant_research_queries').insert({
    tenant_id: input.tenantId,
    employee_id: input.employeeId,
    mode: input.mode,
    sub_tab: input.subTab,
    keyword: input.keyword,
    result_count: input.resultCount,
  })

  if (error) console.error('[law-research] recordHistory', error)
}

/**
 * 条文・通達の「直接指定」を一覧1件として返す。
 * 検索ではなく指定なのでここでは外部通信せず、詳細取得（fetchResearchDocument）へ繋ぐ。
 */
function directHit(input: {
  id: string
  title: string
  identifier: string
  ref: ResearchRef
  sourceUrl: string
}): ResearchResult<ResearchHit[]> {
  return {
    ok: true,
    data: [
      {
        id: input.id,
        title: input.title,
        identifier: input.identifier,
        dateLabel: '',
        summary: '',
        ref: input.ref,
        sourceUrl: input.sourceUrl,
      },
    ],
  }
}

/** サブタブごとの検索を実行する */
async function dispatchSearch(input: {
  subTab: ResearchSubTab
  keyword: string
  article?: string
}): Promise<ResearchResult<ResearchHit[]>> {
  const { subTab, keyword, article } = input

  switch (subTab) {
    // --- キーワード検索（外部通信あり）---
    case 'labor_mhlw':
      return laborSearchMhlw(keyword)
    case 'labor_jaish':
      return laborSearchJaish(keyword)
    case 'law_search':
      return laborSearchLaw(keyword)
    case 'tax_saiketsu':
      return taxSearchSaiketsu(keyword)
    case 'law_revision':
      return callExternal('改正履歴', () => fetchLawRevisions(keyword), { sourceUrl: EGOV_SITE })

    // --- 直接指定（外部通信は詳細取得で行う）---
    // 条文取得は e-Gov v2 を叩く点で税法・労務法・法令モードとも同一のため、
    // ref は共通の law_article / law_toc に寄せる（DRY）
    case 'tax_article':
    case 'labor_article':
    case 'law_article':
      return directHit({
        id: `${subTab}-${keyword}-${article ?? ''}`,
        title: article ? `${keyword} 第${article}条` : `${keyword} 目次`,
        identifier: article ? `第${article}条` : '',
        ref: article
          ? { kind: 'law_article', lawName: keyword, article }
          : { kind: 'law_toc', lawName: keyword },
        sourceUrl: EGOV_SITE,
      })

    // 通達番号を知らないユーザーが大半なので、番号未入力なら目次を返して辿れるようにする
    case 'tax_tsutatsu':
      return directHit({
        id: `${keyword}-${article ?? 'toc'}`,
        title: article ? `${keyword} ${article}` : `${keyword} 目次`,
        identifier: article ?? '',
        ref: article
          ? { kind: 'tax_tsutatsu', tsutatsuName: keyword, number: article }
          : { kind: 'tax_tsutatsu_toc', tsutatsuName: keyword },
        sourceUrl: NTA_SITE,
      })

    default:
      return {
        ok: false,
        error: { kind: 'invalid_input', message: '不正な検索対象が指定されました。' },
      }
  }
}

/**
 * 検索を実行し、履歴を記録する。
 * 外部サイトへの通信はすべてこの Server Action の中で行う。
 */
export async function runResearchSearch(input: {
  mode: ResearchMode
  subTab: ResearchSubTab
  keyword: string
  article?: string
}): Promise<ResearchResult<ResearchHit[]>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return UNAUTHORIZED

  const keyword = input.keyword?.trim()
  if (!keyword) {
    return {
      ok: false,
      error: { kind: 'invalid_input', message: '検索キーワードを入力してください。' },
    }
  }

  const result = await dispatchSearch({
    subTab: input.subTab,
    keyword,
    article: input.article?.trim() || undefined,
  })

  await recordHistory({
    tenantId: user.tenant_id,
    employeeId: user.employee_id ?? null,
    mode: input.mode,
    subTab: input.subTab,
    keyword,
    resultCount: result.ok ? result.data.length : 0,
  })

  return result
}

/** 一覧行から原文全文を取得する */
export async function fetchResearchDocument(
  ref: ResearchRef
): Promise<ResearchResult<ResearchDocument>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return UNAUTHORIZED

  switch (ref.kind) {
    case 'law_article':
      return laborGetLawArticle(ref.lawName, ref.article)
    case 'law_toc':
      return laborGetLawToc(ref.lawName)
    case 'mhlw_tsutatsu':
      return laborGetMhlw(ref.dataId)
    case 'jaish_tsutatsu':
      return laborGetJaish(ref.url)
    case 'tax_tsutatsu':
      return taxGetTsutatsu(ref.tsutatsuName, ref.number)
    case 'tax_tsutatsu_toc':
      return taxListTsutatsuToc(ref.tsutatsuName)
    case 'saiketsu':
      return taxGetSaiketsu(ref.url)
    default:
      return {
        ok: false,
        error: { kind: 'invalid_input', message: '不正な取得対象が指定されました。' },
      }
  }
}
```

- [ ] **Step 3: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/features/law-research/queries.ts src/features/law-research/actions.ts
git commit -m "feat: 調べる機能の検索・原文取得 Server Actions を追加"
```

---

### Task 8: AI 要約（openrouter 拡張 + プロンプト + Server Action）

**Files:**

- Modify: `src/lib/ai/openrouter.ts`（`OpenRouterChatOptions` に `reasoning` を追加、body に反映）
- Create: `src/features/law-research/lib/summarize-prompt.ts`
- Test: `src/features/law-research/lib/summarize-prompt.test.ts`
- Modify: `src/features/law-research/actions.ts`（`summarizeResearchDocument` を追加）

**Interfaces:**

- Consumes: `ResearchDocument`（Task 1）、`openRouterChat` / `OPENROUTER_SUMMARIZE_MODEL`（既存）
- Produces:
  - `buildSummarySystemPrompt(): string` / `buildSummaryUserPrompt(doc: ResearchDocument): string` / `SUMMARY_MAX_TOKENS`（summarize-prompt.ts）
  - `summarizeResearchDocument(doc: ResearchDocument): Promise<ResearchResult<string>>`（actions.ts）

- [ ] **Step 1: 失敗するテストを書く**

`src/features/law-research/lib/summarize-prompt.test.ts`:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  SUMMARY_MAX_TOKENS,
} from './summarize-prompt'
import type { ResearchDocument } from '../types'

function makeDoc(overrides: Partial<ResearchDocument> = {}): ResearchDocument {
  return {
    title: '労働基準法 第36条（時間外及び休日の労働）',
    identifier: '第36条',
    body: '使用者は、当該事業場に、労働者の過半数で組織する労働組合がある場合においては…',
    sourceUrl: 'https://laws.e-gov.go.jp/law/322AC0000000049',
    fetchedAt: '2026-08-18T09:00:00.000Z',
    ...overrides,
  }
}

test('SUMMARY_MAX_TOKENS: thinking で食い潰されないよう既定の2000より大きい', () => {
  assert.ok(SUMMARY_MAX_TOKENS > 2000)
})

test('buildSummarySystemPrompt: 原文のみを根拠にする制約を含む', () => {
  const p = buildSummarySystemPrompt()
  assert.match(p, /原文/)
  assert.match(p, /原文に無いこと/)
  assert.match(p, /原文からは判断できません/)
  assert.match(p, /条番号/)
})

test('buildSummarySystemPrompt: 検索や推測を禁じている', () => {
  const p = buildSummarySystemPrompt()
  assert.match(p, /検索/)
  assert.match(p, /推測/)
})

test('buildSummaryUserPrompt: タイトル・出典・取得日時・本文をすべて含む', () => {
  const prompt = buildSummaryUserPrompt(makeDoc())
  assert.match(prompt, /労働基準法 第36条/)
  assert.match(prompt, /https:\/\/laws\.e-gov\.go\.jp\/law\/322AC0000000049/)
  assert.match(prompt, /2026-08-18/)
  assert.match(prompt, /労働者の過半数で組織する労働組合/)
})

test('buildSummaryUserPrompt: 極端に長い本文は打ち切られる', () => {
  const prompt = buildSummaryUserPrompt(makeDoc({ body: 'あ'.repeat(50000) }))
  assert.ok(prompt.length < 40000)
  assert.match(prompt, /以下略/)
})
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `node --import tsx --test src/features/law-research/lib/summarize-prompt.test.ts`
Expected: FAIL（`Cannot find module './summarize-prompt'`）

- [ ] **Step 3: プロンプト生成を実装**

`src/features/law-research/lib/summarize-prompt.ts`:

```typescript
import type { ResearchDocument } from '../types'

/**
 * 要約の出力トークン上限。
 * 既定モデル google/gemini-2.5-flash は Gemini 2.5 系で thinking が既定 ON のため、
 * openRouterChat の既定値 2000 では thinking に食われて要約が途中終了しうる。
 * reasoning.exclude と併用しつつ、上限自体も引き上げておく。
 */
export const SUMMARY_MAX_TOKENS = 4000

/** プロンプトに載せる本文の最大文字数。これを超えた分は切り捨てる */
const MAX_BODY_CHARS = 30000

/**
 * 要約の system プロンプト。
 * ハルシネーションを構造的に防ぐため、入力された原文の外へ出ることを禁じる。
 */
export function buildSummarySystemPrompt(): string {
  return [
    'あなたは日本の人事実務者を補助するアシスタントです。',
    'ユーザーから与えられた法令・通達・裁決事例の原文を要約することだけが役割です。',
    '',
    '厳守事項:',
    '1. 与えられた原文のみを根拠に要約してください。原文に無いことは一切書かないでください。',
    '2. 検索をしてはいけません。あなたの知識から補足してもいけません。推測で補ってもいけません。',
    '3. 原文から判断できない場合は「原文からは判断できません」と明記してください。',
    '4. 条番号・通達番号・日付は、原文の表記をそのまま転記してください。言い換えないでください。',
    '5. 法的な助言や、適用可否の断定をしてはいけません。原文が何を定めているかの説明にとどめてください。',
    '',
    '出力形式:',
    '- 冒頭に3行以内の概要',
    '- その後に「要点」として箇条書き（最大7項目）',
    '- 日本語で書いてください',
  ].join('\n')
}

/** 要約対象の原文を user プロンプトへ整形する */
export function buildSummaryUserPrompt(doc: ResearchDocument): string {
  const truncated =
    doc.body.length > MAX_BODY_CHARS
      ? `${doc.body.slice(0, MAX_BODY_CHARS)}\n\n（以下略：原文が長いため途中までを掲載しています）`
      : doc.body

  return [
    `【タイトル】${doc.title}`,
    doc.identifier ? `【番号】${doc.identifier}` : '',
    `【出典】${doc.sourceUrl}`,
    `【取得日時】${doc.fetchedAt}`,
    '',
    '【原文】',
    truncated,
  ]
    .filter(line => line !== '')
    .join('\n')
}
```

- [ ] **Step 4: テストを実行して成功を確認**

Run: `node --import tsx --test src/features/law-research/lib/summarize-prompt.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: openRouterChat に reasoning オプションを追加**

`src/lib/ai/openrouter.ts` の `OpenRouterChatOptions` を以下に差し替える（既存フィールドはそのまま、`reasoning` を追加するだけ）:

```typescript
export type OpenRouterChatOptions = {
  model?: string
  messages: OpenRouterMessage[]
  temperature?: number
  maxTokens?: number
  json?: boolean
  tools?: OpenRouterTool[]
  timeoutMs?: number
  /**
   * 推論（thinking）の制御。Gemini 2.5 系は thinking が既定 ON で、
   * max_tokens を食い潰して応答が途中終了することがある。
   * exclude: true で thinking を出力から除外する。未指定時は現状の挙動を維持する。
   */
  reasoning?: { exclude?: boolean }
}
```

`openRouterChat` 内の body 組み立てで、`if (opts.json) {` の直前に以下を挿入する:

```typescript
if (opts.reasoning) {
  body.reasoning = opts.reasoning
}
```

- [ ] **Step 6: 要約 Server Action を追加**

`src/features/law-research/actions.ts` の import に以下を追加する:

```typescript
import { openRouterChat, OPENROUTER_SUMMARIZE_MODEL } from '@/lib/ai/openrouter'
import {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  SUMMARY_MAX_TOKENS,
} from './lib/summarize-prompt'
```

ファイル末尾に以下を追加する:

```typescript
/**
 * 取得済み原文の要約を生成する。
 *
 * 入力は「画面上で実際に取得した原文」のみ。モデルに検索させず、RAG も引かない。
 * ユーザーが明示的に要約ボタンを押したときだけ呼ばれる（自動実行しない）。
 */
export async function summarizeResearchDocument(
  doc: ResearchDocument
): Promise<ResearchResult<string>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return UNAUTHORIZED

  if (!process.env.OPENROUTER_API_KEY) {
    return {
      ok: false,
      error: { kind: 'invalid_input', message: 'OPENROUTER_API_KEY が未設定です。' },
    }
  }

  if (!doc?.body?.trim()) {
    return {
      ok: false,
      error: { kind: 'invalid_input', message: '要約する原文がありません。' },
    }
  }

  return callExternal('AI要約', async () => {
    const res = await openRouterChat({
      model: OPENROUTER_SUMMARIZE_MODEL,
      messages: [
        { role: 'system', content: buildSummarySystemPrompt() },
        { role: 'user', content: buildSummaryUserPrompt(doc) },
      ],
      temperature: 0.1,
      maxTokens: SUMMARY_MAX_TOKENS,
      // Gemini 2.5 系の thinking が出力予算を食い潰し、要約が途中終了するのを防ぐ
      reasoning: { exclude: true },
    })
    return res.content
  })
}
```

- [ ] **Step 7: 型チェックと全テスト**

```bash
npm run type-check
npm test
```

Expected: 型エラーなし。既存テストを含めてすべて PASS。

- [ ] **Step 8: コミット**

```bash
git add src/lib/ai/openrouter.ts src/features/law-research/lib/summarize-prompt.ts src/features/law-research/lib/summarize-prompt.test.ts src/features/law-research/actions.ts
git commit -m "feat: 取得済み原文のみを入力とするAI要約を追加"
```

---

### Task 9: ルート定義・ページ・モードラジオ

**Files:**

- Modify: `src/config/routes.ts`（`TENANT` に `ADMIN_RESEARCH` を追加）
- Create: `src/app/(tenant)/(tenant-admin)/adm/(research)/research/page.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(research)/research/loading.tsx`
- Create: `src/app/(tenant)/(tenant-admin)/adm/(research)/research/error.tsx`
- Create: `src/features/law-research/components/ModeRadioGroup.tsx`
- Create: `src/features/law-research/components/ResearchClient.tsx`

**Interfaces:**

- Consumes: `listResearchHistory`（Task 7）、Task 1 の型
- Produces: `ModeRadioGroup`（props: `value: ResearchMode`, `onChange: (mode: ResearchMode) => void`）、`ResearchClient`（props: `initialMode: ResearchMode`, `initialHistory: ResearchHistoryRow[]`）、`SUB_TABS_BY_MODE`

- [ ] **Step 1: APP_ROUTES にルートを追加**

`src/config/routes.ts` の `TENANT` 内、`ADMIN_HR_ASSISTANT: '/adm/hr-assistant',` の直後に追加する:

```typescript
    /** 調べる（税法・労務法・法令の原文検索）— (research)/research */
    ADMIN_RESEARCH: '/adm/research',
```

- [ ] **Step 2: モードラジオを書く**

`src/features/law-research/components/ModeRadioGroup.tsx`:

```typescript
'use client'

import type { ResearchMode } from '../types'

/** 3モードの表示定義。3つは対等に並べる（税法だけ扱いを変えない） */
const MODES: { value: ResearchMode; label: string; description: string }[] = [
  {
    value: 'tax',
    label: '税法を調べる',
    description: '24の主要税法 + 17の行政通達 + 1,950の裁決事例',
  },
  {
    value: 'labor',
    label: '労務法を調べる',
    description: '45の労働関連法令 + 厚労省通達をカバー',
  },
  {
    value: 'law',
    label: '法令を調べる',
    description: '法令名検索、条文取得、改正履歴',
  },
]

export function ModeRadioGroup({
  value,
  onChange,
}: {
  value: ResearchMode
  onChange: (mode: ResearchMode) => void
}) {
  return (
    <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <legend className="sr-only">調べる対象</legend>
      {MODES.map(mode => {
        const selected = mode.value === value
        return (
          <label
            key={mode.value}
            className={`flex items-start gap-2.5 rounded-lg border p-4 cursor-pointer transition-colors ${
              selected
                ? 'border-[#FD7601] bg-[#FD7601]/5'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="research-mode"
              value={mode.value}
              checked={selected}
              onChange={() => onChange(mode.value)}
              className="mt-0.5 accent-[#FD7601]"
            />
            <span className="min-w-0">
              <span
                className={`block text-sm font-medium ${
                  selected ? 'text-[#FD7601]' : 'text-slate-900'
                }`}
              >
                {mode.label}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">{mode.description}</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
```

- [ ] **Step 3: ResearchClient の骨格を書く**

この時点でモード切替・サブタブ・URL 同期・フッター注記まで完成した状態にする。検索 UI は Task 10、詳細と履歴は Task 11 で差し込む。

`src/features/law-research/components/ResearchClient.tsx`:

```typescript
'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ModeRadioGroup } from './ModeRadioGroup'
import type { ResearchHistoryRow, ResearchMode, ResearchSubTab } from '../types'

/** モードごとのサブタブ定義 */
export const SUB_TABS_BY_MODE: Record<
  ResearchMode,
  { value: ResearchSubTab; label: string }[]
> = {
  tax: [
    { value: 'tax_article', label: '条文' },
    { value: 'tax_tsutatsu', label: '通達' },
    { value: 'tax_saiketsu', label: '裁決事例' },
  ],
  labor: [
    { value: 'labor_article', label: '条文' },
    { value: 'labor_mhlw', label: '厚労省通達' },
    { value: 'labor_jaish', label: '安衛通達' },
  ],
  law: [
    { value: 'law_search', label: '法令検索' },
    { value: 'law_article', label: '条文' },
    { value: 'law_revision', label: '改正履歴' },
  ],
}

export function ResearchClient({
  initialMode,
  initialHistory,
}: {
  initialMode: ResearchMode
  initialHistory: ResearchHistoryRow[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<ResearchMode>(initialMode)
  const [subTab, setSubTab] = useState<ResearchSubTab>(SUB_TABS_BY_MODE[initialMode][0].value)

  // モードは URL に持たせて共有・ブックマークできるようにする
  const handleModeChange = useCallback(
    (next: ResearchMode) => {
      setMode(next)
      setSubTab(SUB_TABS_BY_MODE[next][0].value)

      const params = new URLSearchParams(searchParams.toString())
      params.set('mode', next)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 mx-auto w-full max-w-[1920px] space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">調べる</h1>
        <p className="text-xs text-slate-500">
          法令・通達・裁決事例の原文を検索して確認します。AI は取得した原文の要約のみを行います。
        </p>
      </header>

      <ModeRadioGroup value={mode} onChange={handleModeChange} />

      <nav className="flex gap-1 border-b border-slate-200" aria-label="検索対象">
        {SUB_TABS_BY_MODE[mode].map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSubTab(tab.value)}
            className={`px-3 py-1.5 text-xs border-b-2 -mb-px transition-colors ${
              subTab === tab.value
                ? 'border-[#FD7601] text-[#FD7601] font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <p className="text-xs text-slate-400">
        現在の対象: {mode} / {subTab}（履歴 {initialHistory.length} 件）
      </p>

      <footer className="pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          本機能は参考情報です。最終的な判断は社会保険労務士・税理士等の専門家にご確認ください。
        </p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 4: page / loading / error を書く**

`src/app/(tenant)/(tenant-admin)/adm/(research)/research/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { ResearchClient } from '@/features/law-research/components/ResearchClient'
import { listResearchHistory } from '@/features/law-research/queries'
import type { ResearchMode } from '@/features/law-research/types'

/** クエリのモード指定を検証する。不正値は労務法モードにフォールバックする */
function parseMode(value: unknown): ResearchMode {
  return value === 'tax' || value === 'labor' || value === 'law' ? value : 'labor'
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const params = await searchParams
  const initialMode = parseMode(params.mode)
  const history = await listResearchHistory()

  return <ResearchClient initialMode={initialMode} initialHistory={history} />
}
```

`src/app/(tenant)/(tenant-admin)/adm/(research)/research/loading.tsx`:

```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
```

`src/app/(tenant)/(tenant-admin)/adm/(research)/research/error.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-3xl mx-auto">
      <Alert variant="destructive">
        <AlertTitle>エラーが発生しました</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message}
          <div className="mt-4">
            <Button onClick={reset} variant="outline" size="sm">
              再読み込み
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
```

- [ ] **Step 5: 型チェックとブラウザ確認**

```bash
npm run type-check
npm run dev
```

`http://localhost:3000/adm/research` を開き、以下を確認する:

- ラジオ3つが表示され、選択したものがオレンジ（`#FD7601`）になる
- ラジオを切り替えると URL が `?mode=tax` 等に変わる
- モードを変えるとサブタブの並びが変わる
- フッターに専門家確認の注記が出る

- [ ] **Step 6: コミット**

```bash
git add src/config/routes.ts "src/app/(tenant)/(tenant-admin)/adm/(research)" src/features/law-research/components
git commit -m "feat: 調べる機能のページとモード切替UIを追加"
```

---

### Task 10: 検索フォームと結果一覧

**Files:**

- Create: `src/features/law-research/components/SearchForm.tsx`
- Create: `src/features/law-research/components/ResultList.tsx`
- Modify: `src/features/law-research/components/ResearchClient.tsx`

**Interfaces:**

- Consumes: `runResearchSearch`（Task 7）、`SUB_TABS_BY_MODE`（Task 9）、`DataTable` / `Column`（`@/components/ui/DataTable`）
- Produces: `SearchForm`（props: `subTab: ResearchSubTab`, `pending: boolean`, `onSubmit: (input: { keyword: string; article?: string }) => void`）、`ResultList`（props: `hits: ResearchHit[]`, `selectedId: string | null`, `onSelect: (hit: ResearchHit) => void`）

- [ ] **Step 1: SearchForm を書く**

`src/features/law-research/components/SearchForm.tsx`:

```typescript
'use client'

import { useState } from 'react'

import type { ResearchSubTab } from '../types'

/** 第2入力に条番号が必要なサブタブ */
const SUB_TABS_WITH_ARTICLE: ResearchSubTab[] = ['tax_article', 'labor_article', 'law_article']
/** 第2入力に通達番号が必要なサブタブ */
const SUB_TABS_WITH_NUMBER: ResearchSubTab[] = ['tax_tsutatsu']

/**
 * サブタブごとの第1入力のラベルとプレースホルダ。
 * ResearchClient が「入力欄の意味が変わったか」を判定するために export する
 * （ラベルが同じ間は入力値を保持し、変わったらリセットする）。
 */
export const PRIMARY_FIELD: Record<ResearchSubTab, { label: string; placeholder: string }> = {
  tax_article: { label: '法令名', placeholder: '法人税法 / 所得税法' },
  tax_tsutatsu: { label: '通達名', placeholder: '法人税基本通達' },
  tax_saiketsu: { label: 'キーワード', placeholder: '交際費 / 役員報酬' },
  labor_article: { label: '法令名', placeholder: '労働基準法 / 労基法' },
  labor_mhlw: { label: 'キーワード', placeholder: '36協定 / 賃金不払残業' },
  labor_jaish: { label: 'キーワード', placeholder: 'ストレスチェック' },
  law_search: { label: 'キーワード', placeholder: '育児 / 個人情報' },
  law_article: { label: '法令名', placeholder: '民法 / 個人情報の保護に関する法律' },
  law_revision: { label: '法令ID', placeholder: '322AC0000000049' },
}

export function SearchForm({
  subTab,
  pending,
  onSubmit,
}: {
  subTab: ResearchSubTab
  pending: boolean
  onSubmit: (input: { keyword: string; article?: string }) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [article, setArticle] = useState('')

  const needsArticle = SUB_TABS_WITH_ARTICLE.includes(subTab)
  const needsNumber = SUB_TABS_WITH_NUMBER.includes(subTab)
  const field = PRIMARY_FIELD[subTab]

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={e => {
        e.preventDefault()
        onSubmit({ keyword, article: needsArticle || needsNumber ? article : undefined })
      }}
    >
      <div className="flex flex-col gap-1 min-w-[240px] flex-1">
        <label className="text-xs text-slate-600" htmlFor="research-keyword">
          {field.label}
        </label>
        <input
          id="research-keyword"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder={field.placeholder}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#FD7601]"
        />
      </div>

      {(needsArticle || needsNumber) && (
        <div className="flex flex-col gap-1 w-[160px]">
          {/* いずれも任意。未入力なら目次を返し、そこから辿れるようにする */}
          <label className="text-xs text-slate-600" htmlFor="research-article">
            {needsArticle ? '条番号（任意）' : '通達番号（任意）'}
          </label>
          <input
            id="research-article"
            value={article}
            onChange={e => setArticle(e.target.value)}
            placeholder={needsArticle ? '36' : '33-6'}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#FD7601]"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !keyword.trim()}
        className="px-3 py-1.5 text-xs rounded-lg bg-[#FD7601] text-white font-medium hover:bg-[#e56a00] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? '検索中…' : '検索'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: ResultList を書く**

`src/features/law-research/components/ResultList.tsx`:

```typescript
'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { ResearchHit } from '../types'

export function ResultList({
  hits,
  selectedId,
  onSelect,
}: {
  hits: ResearchHit[]
  selectedId: string | null
  onSelect: (hit: ResearchHit) => void
}) {
  const columns: Column<ResearchHit>[] = [
    {
      key: 'title',
      label: 'タイトル',
      render: (value, item) => (
        <button
          type="button"
          onClick={() => onSelect(item)}
          className={`text-left hover:underline ${
            item.id === selectedId ? 'text-[#FD7601] font-medium' : 'text-slate-900'
          }`}
        >
          {String(value)}
        </button>
      ),
    },
    { key: 'identifier', label: '番号', width: 'w-56' },
    { key: 'dateLabel', label: '日付', width: 'w-32' },
    {
      key: 'summary',
      label: '要旨',
      render: value => {
        const text = String(value ?? '')
        return (
          <span className="text-slate-600">
            {text.length > 80 ? `${text.slice(0, 80)}…` : text}
          </span>
        )
      },
    },
  ]

  if (hits.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        検索条件を入力して検索してください。
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={hits}
      searchable={false}
      itemsPerPage={20}
      getRowId={item => item.id}
    />
  )
}
```

- [ ] **Step 3: ResearchClient に検索状態を組み込む**

既存の react の import 行を書き換える（**新しい `from 'react'` 行を追加しないこと**。重複 import になり `npm run lint` で落ちる）:

```typescript
import { useCallback, useState, useTransition } from 'react'
```

続けて、以下の import を追加する:

```typescript
import { runResearchSearch } from '../actions'
import { ResultList } from './ResultList'
import { PRIMARY_FIELD, SearchForm } from './SearchForm'
import type { ResearchError, ResearchHit } from '../types'
```

`const [subTab, setSubTab] = ...` の直後に追加:

```typescript
const [hits, setHits] = useState<ResearchHit[]>([])
const [selectedHit, setSelectedHit] = useState<ResearchHit | null>(null)
const [searchError, setSearchError] = useState<ResearchError | null>(null)
const [pending, startTransition] = useTransition()

const handleSearch = useCallback(
  (input: { keyword: string; article?: string }) => {
    startTransition(async () => {
      setSearchError(null)
      setSelectedHit(null)
      const result = await runResearchSearch({
        mode,
        subTab,
        keyword: input.keyword,
        article: input.article,
      })
      if (result.ok === true) {
        setHits(result.data)
      } else {
        setHits([])
        setSearchError(result.error)
      }
    })
  },
  [mode, subTab]
)
```

`<p className="text-xs text-slate-400">現在の対象: ...</p>` の段落を、以下で置き換える:

```typescript
      {/*
        key に入力欄のラベルを使うことで、入力欄の意味が変わったときだけ
        SearchForm を再マウントして入力値をリセットする。
        「厚労省通達」↔「安衛通達」はどちらも『キーワード』欄なので値が保持され、
        「法令名」→「キーワード」→「法令ID」のように意味が変わる切替ではリセットされる。
      */}
      <SearchForm
        key={PRIMARY_FIELD[subTab].label}
        subTab={subTab}
        pending={pending}
        onSubmit={handleSearch}
      />

      {searchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">{searchError.message}</p>
          {searchError.sourceUrl && (
            <a
              href={searchError.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-red-700 underline mt-1 inline-block"
            >
              出典サイトを直接開く
            </a>
          )}
        </div>
      )}

      <ResultList hits={hits} selectedId={selectedHit?.id ?? null} onSelect={setSelectedHit} />
```

- [ ] **Step 4: 型チェックとブラウザ確認**

```bash
npm run type-check
npm run dev
```

`http://localhost:3000/adm/research?mode=labor` で確認する:

- 「厚労省通達」タブ →「36協定」で検索 → 結果一覧が出る
- 「安衛通達」タブ →「ストレスチェック」で検索 → 結果一覧が出る
- 「条文」タブ → 法令名「労働基準法」条番号「36」→ 1行返る
- **略称が効くこと**: 「条文」タブ → 法令名「労基法」条番号「32」→ 「労働基準法 第32条」として解決される（PRD の Should 要件。パッケージの `LAW_ID_MAP` と略称変換に依存）
- **プリセット外の法令が引けること**: 「法令」モード →「条文」タブ → 法令名「民法」条番号「709」→ e-Gov 検索フォールバックで取得できる
- 存在しない法令名で検索 → 赤いエラーボックスと「出典サイトを直接開く」が出る

- [ ] **Step 5: コミット**

```bash
git add src/features/law-research/components
git commit -m "feat: 調べる機能の検索フォームと結果一覧を追加"
```

---

### Task 11: 原文詳細・AI要約・検索履歴

**Files:**

- Create: `src/features/law-research/components/SourceDetailPanel.tsx`
- Create: `src/features/law-research/components/AiSummaryCard.tsx`
- Create: `src/features/law-research/components/HistoryPanel.tsx`
- Modify: `src/features/law-research/components/ResearchClient.tsx`

**Interfaces:**

- Consumes: `fetchResearchDocument` / `summarizeResearchDocument`（Task 7・8）、Task 1 の型
- Produces: `SourceDetailPanel`（props: `hit: ResearchHit | null`, `doc: ResearchDocument | null`, `loading: boolean`, `error: ResearchError | null`）、`AiSummaryCard`（props: `doc: ResearchDocument`）、`HistoryPanel`（props: `rows: ResearchHistoryRow[]`, `onPick: (row: ResearchHistoryRow) => void`）

- [ ] **Step 1: AiSummaryCard を書く**

`src/features/law-research/components/AiSummaryCard.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'

import { summarizeResearchDocument } from '../actions'
import type { ResearchDocument } from '../types'

// prop 名は doc。DOM グローバルの document をシャドーイングしないため
export function AiSummaryCard({ doc }: { doc: ResearchDocument }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // 自動実行しない。ユーザーが明示的に押したときだけ要約する（コスト制御と誤用防止）
  const handleSummarize = () => {
    startTransition(async () => {
      setError(null)
      const result = await summarizeResearchDocument(doc)
      if (result.ok === true) setSummary(result.data)
      else setError(result.error.message)
    })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-900">AI要約</h3>
        <button
          type="button"
          onClick={handleSummarize}
          disabled={pending}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#FD7601] text-[#FD7601] font-medium hover:bg-[#FD7601]/5 disabled:opacity-50"
        >
          {pending ? '要約中…' : summary ? '再要約' : 'この原文を要約する'}
        </button>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      {summary && (
        <>
          <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
            {summary}
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            この要約は上記の原文のみを根拠に生成されています。正本は原文です。 出典:{' '}
            <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {doc.sourceUrl}
            </a>
            （取得: {doc.fetchedAt.slice(0, 10)}）
          </p>
        </>
      )}

      {!summary && !error && (
        <p className="text-xs text-slate-500">
          ボタンを押すと、表示中の原文だけを入力としてAIが要約します。検索や推測は行いません。
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: SourceDetailPanel を書く**

`src/features/law-research/components/SourceDetailPanel.tsx`:

```typescript
'use client'

import { AiSummaryCard } from './AiSummaryCard'
import type { ResearchDocument, ResearchError, ResearchHit } from '../types'

// prop 名は doc。DOM グローバルの document をシャドーイングしないため
export function SourceDetailPanel({
  hit,
  doc,
  loading,
  error,
}: {
  hit: ResearchHit | null
  doc: ResearchDocument | null
  loading: boolean
  error: ResearchError | null
}) {
  if (!hit) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        一覧からタイトルを選ぶと、ここに原文の全文を表示します。
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 space-y-2">
        <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <p className="text-xs text-red-700">{error.message}</p>
        <a
          href={error.sourceUrl ?? hit.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-red-700 underline mt-2 inline-block"
        >
          出典サイトで直接確認する
        </a>
      </div>
    )
  }

  if (!doc) return null

  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <header className="space-y-1 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-900">{doc.title}</h2>
          <p className="text-[11px] text-slate-500">
            出典:{' '}
            <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {doc.sourceUrl}
            </a>
            {' ／ '}取得日時: {doc.fetchedAt.slice(0, 19).replace('T', ' ')}
          </p>
        </header>

        <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
          {doc.body}
        </div>
      </article>

      <AiSummaryCard doc={doc} />
    </div>
  )
}
```

- [ ] **Step 3: HistoryPanel を書く**

`src/features/law-research/components/HistoryPanel.tsx`:

```typescript
'use client'

import type { ResearchHistoryRow, ResearchMode } from '../types'

const MODE_LABEL: Record<ResearchMode, string> = {
  tax: '税法',
  labor: '労務法',
  law: '法令',
}

export function HistoryPanel({
  rows,
  onPick,
}: {
  rows: ResearchHistoryRow[]
  onPick: (row: ResearchHistoryRow) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-xs text-slate-500">
        検索履歴はまだありません。
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
      <h3 className="text-sm font-medium text-slate-900">検索履歴</h3>
      <ul className="divide-y divide-slate-100">
        {rows.map(row => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onPick(row)}
              className="w-full text-left py-1.5 hover:bg-slate-50 flex items-center gap-2"
            >
              <span className="text-[11px] text-slate-400 w-14 shrink-0">
                {MODE_LABEL[row.mode] ?? row.mode}
              </span>
              <span className="text-xs text-slate-800 truncate flex-1">{row.keyword}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{row.result_count}件</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: ResearchClient に詳細取得と履歴を組み込む**

import に追加:

```typescript
import { fetchResearchDocument } from '../actions'
import { HistoryPanel } from './HistoryPanel'
import { SourceDetailPanel } from './SourceDetailPanel'
import type { ResearchDocument } from '../types'
```

`handleSearch` の直後に追加:

```typescript
// 変数名は doc 系。DOM グローバルの document をシャドーイングしないため
const [doc, setDoc] = useState<ResearchDocument | null>(null)
const [docError, setDocError] = useState<ResearchError | null>(null)
const [docLoading, setDocLoading] = useState(false)

const handleSelect = useCallback((hit: ResearchHit) => {
  setSelectedHit(hit)
  setDoc(null)
  setDocError(null)
  setDocLoading(true)

  fetchResearchDocument(hit.ref)
    .then(result => {
      if (result.ok === true) setDoc(result.data)
      else setDocError(result.error)
    })
    .finally(() => setDocLoading(false))
}, [])

// 履歴から再実行する。モードとサブタブも履歴の値へ戻す
const handlePickHistory = useCallback((row: ResearchHistoryRow) => {
  setMode(row.mode)
  setSubTab(row.sub_tab)
  setSelectedHit(null)
  startTransition(async () => {
    const result = await runResearchSearch({
      mode: row.mode,
      subTab: row.sub_tab,
      keyword: row.keyword,
    })
    if (result.ok === true) {
      setHits(result.data)
      setSearchError(null)
    } else {
      setHits([])
      setSearchError(result.error)
    }
  })
}, [])
```

`<ResultList ... />` の行を、以下の2カラムレイアウトへ置き換える:

```typescript
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="space-y-3">
          <ResultList hits={hits} selectedId={selectedHit?.id ?? null} onSelect={handleSelect} />
          <HistoryPanel rows={initialHistory} onPick={handlePickHistory} />
        </div>
        <SourceDetailPanel
          hit={selectedHit}
          doc={doc}
          loading={docLoading}
          error={docError}
        />
      </div>
```

- [ ] **Step 5: 型チェックと全テスト、ブラウザ確認**

```bash
npm run type-check
npm test
npm run dev
```

`http://localhost:3000/adm/research` で確認する:

- 「労務法」→「厚労省通達」→「36協定」で検索 → 一覧のタイトルをクリック → 右に原文全文・出典URL・取得日時が出る
- 「この原文を要約する」を押す → 要約が出て、下に出典と取得日が併記される
- 要約が途中で切れていないこと（thinking 対策が効いているか）
- 履歴に検索が積まれ、クリックで再実行される
- 「税法」→「裁決事例」→「交際費」でも同様に動く
- 「税法」→「通達」→ 通達名「法人税基本通達」のみ（番号未入力）→ 目次が表示される
- 「税法」→「通達」→ 通達名「法人税基本通達」＋番号「33-6」→ 該当エントリの本文が表示される

- [ ] **Step 6: コミット**

```bash
git add src/features/law-research/components
git commit -m "feat: 調べる機能の原文詳細・AI要約・検索履歴を追加"
```

---

### Task 12: サービスマスタ登録

**Files:**

- Create: `supabase/migrations/<タイムスタンプ>_research_service_menu.sql`
- Modify: `docs/implementation-plan-law-research.md`（ステータス更新）

**Interfaces:**

- Consumes: 既存 `public.service` / `public.service_category`
- Produces: `service` に `route_path = '/adm/research'` の1行

- [ ] **Step 1: マイグレーションファイルを作成**

```bash
supabase migration new research_service_menu
```

生成されたファイルに以下を書く:

```sql
-- =============================================================================
-- 「調べる」（/adm/research）のサービスメニュー登録
--
-- モード（税法・労務法・法令）は画面内のラジオボタンなので service は1件のみ。
--
-- ⚠ service / service_category はクラウドDBと同期しているマスタで、
--   環境ごとに id が異なる。UUID は本機能の service.id のみ固定し、
--   カテゴリは既存サービス（/adm/hr-assistant）の route_path から解決する。
--   解決できない場合は WARNING を出してスキップし、マイグレーション自体は失敗させない。
-- =============================================================================

DO $$
DECLARE
  v_service_id CONSTANT uuid := '9f3c07a4-5b18-4d62-9a77-6c0e51b8d3a2';
  v_category_id uuid;
BEGIN
  SELECT s.service_category_id INTO v_category_id
  FROM public.service s
  WHERE s.route_path = '/adm/hr-assistant'
    AND s.service_category_id IS NOT NULL
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE WARNING '[research] サービスカテゴリを解決できませんでした。'
      '/adm/research のメニュー登録をスキップします（手動登録してください）。';
  ELSE
    INSERT INTO public.service (
      id, service_category_id, name, category, title, description,
      sort_order, route_path, app_role_group_id, app_role_group_uuid,
      target_audience, release_status
    ) VALUES (
      v_service_id,
      v_category_id,
      '調べる',
      NULL,
      '税法・労務法・法令の条文と通達を原文で確認する',
      '税法・労務法・一般法令の条文、行政通達、裁決事例を横断して検索し、原文を出典URL付きで表示します。AIは取得した原文の要約のみを行います。',
      40,
      '/adm/research',
      NULL,
      NULL,
      'adm',
      '公開'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
```

- [ ] **Step 2: ローカルに適用**

```bash
supabase migration up
```

Expected: WARNING が出ずに適用される。**データを初期化するリセット系コマンドは絶対に実行しない。**

- [ ] **Step 3: 登録内容を確認**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:55422/postgres" -c "SELECT name, route_path, target_audience, release_status FROM public.service WHERE route_path = '/adm/research';"
```

Expected: 1行返り、`target_audience` が `adm`、`release_status` が `公開`

- [ ] **Step 4: メニュー表示を確認**

```bash
npm run dev
```

テナント管理者でログインし、サービス機能メニューに「調べる」が出ることを確認する。出ない場合は `tenant_service` / `app_role_service` への割当が必要かを `AppSidebar` の絞り込み条件を読んで確認する。

- [ ] **Step 5: PRD のステータスを更新**

`docs/implementation-plan-law-research.md` の3行目を以下に変更する:

```markdown
**ステータス:** 実装済み（2026-08-18）
```

- [ ] **Step 6: コミット**

```bash
git add supabase/migrations/ docs/implementation-plan-law-research.md
git commit -m "feat: 調べる機能のサービスメニューを登録"
```

---

## 実装完了後の確認

- [ ] `npm test` が全件 PASS
- [ ] `npm run type-check` がエラーなし
- [ ] `npm run lint` がエラーなし
- [ ] `npm run build` が成功する（deep import が webpack ビルドを通ることの確認。**失敗する場合は `next.config.ts` の `serverExternalPackages` に `tax-law-mcp` と `labor-law-mcp` を追加する**）
- [ ] `npm run smoke:law-research` が全項目 OK
- [ ] 3モード × 各サブタブで検索と原文表示ができる
- [ ] 外部サイト障害時に赤いエラーボックスと出典リンクが出る（意図的に不正な法令名で確認）
- [ ] 本番 Supabase へのマイグレーション適用は、ユーザーの承認を得てから行う
