# AI人事アシスタント Phase 2: 法令ナレッジ自動更新 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 週次バッチが厚労省等の公的サイトから最新の法令情報を自動収集・要約・埋め込み登録し、`/adm/hr-assistant` のチャット回答に出典URL・取得日付きで反映する。SaaS管理者は `/saas_adm/hr-law-knowledge` で収集結果を確認・無効化・手動再実行できる。

**Architecture:** 全テナント共有の法令ナレッジ用テーブル（`hr_law_sources` / `hr_law_documents` / `hr_law_chunks`）を新設し、Supabase Edge Function `hr-law-refresh`（Deno）が pg_cron 経由で週次実行される。処理フロー: SerpAPI で公的ドメイン限定検索 → 公的ドメインのホワイトリストで再検証 → 本文取得・簡易テキスト抽出 → `content_hash` で重複スキップ → Gemini REST API で構造化要約 → チャンク分割・埋め込み（Gemini REST API）→ DB 登録。SerpAPI 残量が閾値を下回ったら service_role 権限で `send-email` 相当の Deno SMTP 送信を行い `SAAS_ALERT_EMAIL` へ警告する。チャット側（`hr-assistant/actions.ts`）は既存の `match_tenant_rag_chunks` に加えて新設 RPC `match_hr_law_chunks` を並列実行し、コンテキストを「社内資料」「法令情報（出典・取得日付き）」の2系統に分けてプロンプトへ渡す。

**Tech Stack:** Next.js 16 App Router / Supabase (PostgreSQL + RLS + pg_cron + Edge Functions/Deno) / Gemini REST API（generateContent, batchEmbedContents）/ SerpAPI / node:test + tsx

**Spec:** `docs/implementation-plan-ai-hr-assistant-evolution.md`（PRD）の Phase 2 部分（6章・7.1節・8章・13章決定事項）

## Global Constraints

- コードコメントは日本語で記述する
- テナント向け `actions.ts`（`src/features/hr-assistant/actions.ts`）で `createAdminClient()` を使わない。SaaS管理者専用の `src/features/saas-law-knowledge/actions.ts` では使用可（既存の `global-skill-templates/actions.ts` と同じ許容パターン）
- `supabase db reset` は絶対に実行しない。適用は `supabase migration up`
- テストは `node --import tsx --test`（`npm test`、glob は `src/**/*.test.ts`）。**Supabase Edge Functions（Deno、`supabase/functions/` 配下）は本プロジェクトの既存13関数すべてに単体テストが存在しない確立された慣行であり、本計画でも新規に Deno 用テストランナーを導入しない**（YAGNI）。`src/` 配下に置く純粋関数（チャット側のコンテキスト整形等）は通常どおり TDD 対象とする
- TypeScript は strict: false（現状維持）。パスエイリアス `@/*` → `./src/*`
- 新規テーブルには必ず RLS ポリシーを設定する
- URL のハードコードは禁止。`APP_ROUTES` 定数を使う
- 法令ナレッジは全テナント共有（tenant_id を持たない）。公開情報のみを対象とする
- 収集対象は公的ドメインのホワイトリストに限定する（`mhlw.go.jp`, `jsite.mhlw.go.jp`, `e-gov.go.jp`, `nenkin.go.jp`, `jil.go.jp`）
- SerpAPI 残量警告の宛先は `SAAS_ALERT_EMAIL` 環境変数（ハードコード禁止）
- inquiry-chat（一般従業員向け「お問合せ」）には一切変更を加えない

---

### Task 1: マイグレーション（法令ナレッジテーブル + RLS + RPC + seed 8トピック）

**Files:**

- Create: `supabase/migrations/<timestamp>_hr_law_knowledge.sql`（`supabase migration new hr_law_knowledge` で生成）

**Interfaces:**

- Produces:
  - テーブル `public.hr_law_sources`（列: `id, topic, search_query, enabled, last_run_at, created_at`）
  - テーブル `public.hr_law_documents`（列: `id, source_id, title, source_url, content_hash, summary, published_at, fetched_at, status, created_at`）
  - テーブル `public.hr_law_chunks`（列: `id, document_id, chunk_index, content, embedding vector(1536), metadata jsonb, created_at`）
  - RPC `match_hr_law_chunks(query_embedding vector(1536), match_count integer DEFAULT 4) RETURNS TABLE(id uuid, document_id uuid, content text, metadata jsonb, similarity double precision)`

- [ ] **Step 1: マイグレーションファイルを作成**

Run: `supabase migration new hr_law_knowledge`

生成されたファイルに以下を記述:

```sql
-- =============================================================================
-- AI人事アシスタント: 法令ナレッジ自動更新（Phase 2）
-- 全テナント共有（tenant_id を持たない）。厚労省等の公的ドメインから収集した
-- 公開情報のみを対象とするため、テナント分離は不要。
-- =============================================================================

-- 監視トピックマスタ（SaaS管理者がメンテ）
CREATE TABLE public.hr_law_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         text NOT NULL,
  search_query  text NOT NULL,
  enabled       boolean NOT NULL DEFAULT true,
  last_run_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 収集した法令情報
CREATE TABLE public.hr_law_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     uuid REFERENCES public.hr_law_sources(id) ON DELETE SET NULL,
  title         text NOT NULL,
  source_url    text NOT NULL,
  content_hash  text NOT NULL,
  summary       text NOT NULL,
  published_at  date,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'published'
                CHECK (status IN ('published', 'disabled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_hash)
);

CREATE INDEX hr_law_documents_source_idx ON public.hr_law_documents(source_id);
CREATE INDEX hr_law_documents_status_idx ON public.hr_law_documents(status);

-- 埋め込みチャンク（tenant_rag_chunks / tenant_hr_assistant_templates と同じ 1536 次元）
CREATE TABLE public.hr_law_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES public.hr_law_documents(id) ON DELETE CASCADE,
  chunk_index  int NOT NULL,
  content      text NOT NULL,
  embedding    vector(1536),
  metadata     jsonb DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hr_law_chunks_document_idx ON public.hr_law_chunks(document_id);

-- RLS 有効化
ALTER TABLE public.hr_law_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_law_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_law_chunks ENABLE ROW LEVEL SECURITY;

-- SELECT: 公開情報のため authenticated 全員に許可。
-- 書き込みは service_role のみ（週次ジョブ・SaaS管理画面の Server Action は
-- createAdminClient() を使用。RLS ポリシーを敢えて定義しないことで
-- authenticated からの書き込みを一律拒否する）。
CREATE POLICY "hr_law_sources_select" ON public.hr_law_sources
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hr_law_documents_select" ON public.hr_law_documents
  FOR SELECT TO authenticated USING (status = 'published');

CREATE POLICY "hr_law_chunks_select" ON public.hr_law_chunks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.hr_law_documents d
      WHERE d.id = hr_law_chunks.document_id AND d.status = 'published'
    )
  );

-- 法令チャンクをコサイン距離で検索する RPC（match_tenant_rag_chunks と同じ設計）
CREATE OR REPLACE FUNCTION public.match_hr_law_chunks(
  query_embedding vector(1536),
  match_count integer DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    (1 - (c.embedding <=> query_embedding))::double precision AS similarity
  FROM public.hr_law_chunks c
  JOIN public.hr_law_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND d.status = 'published'
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_hr_law_chunks IS '全テナント共有の法令ナレッジチャンクをコサイン距離で検索';

GRANT EXECUTE ON FUNCTION public.match_hr_law_chunks(vector(1536), integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 監視トピック seed 8件
-- ---------------------------------------------------------------------------
INSERT INTO public.hr_law_sources (topic, search_query) VALUES
  ('最低賃金', '最低賃金 改定 site:mhlw.go.jp'),
  ('社会保険料率', '社会保険料率 改定 site:mhlw.go.jp OR site:nenkin.go.jp'),
  ('労働基準法改正', '労働基準法 改正 site:mhlw.go.jp OR site:e-gov.go.jp'),
  ('育児介護休業法', '育児介護休業法 改正 site:mhlw.go.jp'),
  ('労働安全衛生（ストレスチェック関連）', 'ストレスチェック 労働安全衛生法 site:mhlw.go.jp'),
  ('36協定・時間外労働', '36協定 時間外労働 上限規制 site:mhlw.go.jp'),
  ('ハラスメント防止', 'ハラスメント防止 改正 site:mhlw.go.jp'),
  ('障害者雇用', '障害者雇用促進法 改正 site:mhlw.go.jp OR site:jsite.mhlw.go.jp');
```

- [ ] **Step 2: マイグレーションを適用して検証**

Run: `supabase migration up`
Expected: エラーなく適用完了

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT count(*) FROM hr_law_sources;"`
Expected: `8`

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT proname FROM pg_proc WHERE proname = 'match_hr_law_chunks';"`
Expected: 1行返る

- [ ] **Step 3: 型定義を再生成**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`
Expected: `hr_law_sources`, `hr_law_documents`, `hr_law_chunks` が types.ts に含まれる

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/*_hr_law_knowledge.sql src/lib/supabase/types.ts
git commit -m "feat: 法令ナレッジ自動更新のDBスキーマ（hr_law_sources/documents/chunks）とseed8トピックを追加"
```

---

### Task 2: チャット統合（法令RAGマージ + プロンプト更新 + 出典表示）

**Files:**

- Modify: `src/features/hr-assistant/types.ts`（`Citation` 型に `sourceUrl` / `fetchedAt` を追加）
- Modify: `src/features/hr-assistant/prompts.ts`
- Create: `src/features/hr-assistant/law-context.ts`
- Create: `src/features/hr-assistant/law-context.test.ts`
- Modify: `src/features/hr-assistant/actions.ts`
- Modify: `src/features/hr-assistant/components/MessageBubble.tsx`

**Interfaces:**

- Consumes: RPC `match_hr_law_chunks`（Task 1）
- Produces:
  - `formatLawContextBlocks(rows: LawChunkRow[]): string[]`（law-context.ts）
  - `formatLawCitations(rows: LawChunkRow[]): Citation[]`（law-context.ts）
  - `LawChunkRow` 型（law-context.ts からエクスポート）

- [ ] **Step 1: `Citation` 型を拡張**

`src/features/hr-assistant/types.ts` の `Citation` 型を以下に置き換える:

```typescript
export type Citation = {
  title: string
  snippet: string
  /** 法令情報の出典URL（社内資料の場合は undefined） */
  sourceUrl?: string
  /** 法令情報の取得日（YYYY-MM-DD、社内資料の場合は undefined） */
  fetchedAt?: string
}
```

- [ ] **Step 2: 失敗するテストを書く**

`src/features/hr-assistant/law-context.test.ts`:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import { formatLawContextBlocks, formatLawCitations } from './law-context'
import type { LawChunkRow } from './law-context'

function makeRow(overrides: Partial<LawChunkRow>): LawChunkRow {
  return {
    id: 'chunk-1',
    document_id: 'doc-1',
    content: '最低賃金は毎年10月に改定されます。',
    metadata: {
      document_title: '令和8年度地域別最低賃金改定状況',
      source_url: 'https://www.mhlw.go.jp/example',
      fetched_at: '2026-07-01T00:00:00Z',
    },
    similarity: 0.9,
    ...overrides,
  }
}

test('法令情報として出典URLと取得日を含むコンテキストブロックを生成する', () => {
  const rows = [makeRow({})]
  const blocks = formatLawContextBlocks(rows)
  assert.equal(blocks.length, 1)
  assert.match(blocks[0], /法令情報1/)
  assert.match(blocks[0], /令和8年度地域別最低賃金改定状況/)
  assert.match(blocks[0], /取得日: 2026-07-01/)
  assert.match(blocks[0], /https:\/\/www\.mhlw\.go\.jp\/example/)
  assert.match(blocks[0], /最低賃金は毎年10月に改定されます。/)
})

test('複数行は連番になる', () => {
  const rows = [
    makeRow({ id: 'c1' }),
    makeRow({
      id: 'c2',
      metadata: {
        document_title: '別の文書',
        source_url: 'https://mhlw.go.jp/b',
        fetched_at: '2026-06-01T00:00:00Z',
      },
    }),
  ]
  const blocks = formatLawContextBlocks(rows)
  assert.match(blocks[0], /法令情報1/)
  assert.match(blocks[1], /法令情報2/)
})

test('空配列なら空配列を返す', () => {
  assert.deepEqual(formatLawContextBlocks([]), [])
})

test('metadata の document_title が無い場合は「法令文書」で代替する', () => {
  const rows = [
    makeRow({
      metadata: { source_url: 'https://mhlw.go.jp/x', fetched_at: '2026-07-01T00:00:00Z' },
    }),
  ]
  const blocks = formatLawContextBlocks(rows)
  assert.match(blocks[0], /法令文書/)
})

test('formatLawCitations は最大5件・出典URL/取得日つきで返す', () => {
  const rows = Array.from({ length: 8 }, (_, i) =>
    makeRow({
      id: `c${i}`,
      metadata: {
        document_title: `文書${i}`,
        source_url: `https://mhlw.go.jp/${i}`,
        fetched_at: '2026-07-01T00:00:00Z',
      },
    })
  )
  const citations = formatLawCitations(rows)
  assert.equal(citations.length, 5)
  assert.equal(citations[0].title, '文書0')
  assert.equal(citations[0].sourceUrl, 'https://mhlw.go.jp/0')
  assert.equal(citations[0].fetchedAt, '2026-07-01')
  assert.ok(citations[0].snippet.length > 0)
})
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `node --import tsx --test src/features/hr-assistant/law-context.test.ts`
Expected: FAIL（`Cannot find module './law-context'`）

- [ ] **Step 4: 実装を書く**

`src/features/hr-assistant/law-context.ts`:

```typescript
import type { Citation } from './types'

/** match_hr_law_chunks RPC の戻り値の1行 */
export type LawChunkRow = {
  id: string
  document_id: string
  content: string
  metadata: {
    document_title?: string
    source_url?: string
    fetched_at?: string
  }
  similarity: number
}

/** 取得日時（ISO8601）を YYYY-MM-DD に整形する */
function toDateOnly(iso: string | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

/**
 * 法令チャンクをプロンプトへ渡すコンテキストブロックに整形する。
 * 出典URL・取得日を明記し、社内資料と区別できるようにする。
 */
export function formatLawContextBlocks(rows: LawChunkRow[]): string[] {
  return rows.map((r, i) => {
    const title = r.metadata?.document_title || '法令文書'
    const sourceUrl = r.metadata?.source_url || ''
    const fetchedAt = toDateOnly(r.metadata?.fetched_at)
    return `【法令情報${i + 1}: ${title}（取得日: ${fetchedAt}、出典: ${sourceUrl}）】\n${r.content}`
  })
}

/** 法令チャンクを引用表示用の Citation 配列に整形する（最大5件） */
export function formatLawCitations(rows: LawChunkRow[]): Citation[] {
  return rows.slice(0, 5).map(r => ({
    title: r.metadata?.document_title || '法令文書',
    snippet: r.content.slice(0, 200) + (r.content.length > 200 ? '…' : ''),
    sourceUrl: r.metadata?.source_url,
    fetchedAt: toDateOnly(r.metadata?.fetched_at),
  }))
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `node --import tsx --test src/features/hr-assistant/law-context.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 6: prompts.ts を更新**

`src/features/hr-assistant/prompts.ts` の `buildSystemPrompt` 関数シグネチャと `base` 変数を以下に置き換える:

```typescript
import type { AssistantMode } from './types'

export function buildSystemPrompt(
  mode: AssistantMode,
  hasRagContext: boolean,
  hasLawContext: boolean
): string {
  const contextNote = [
    hasRagContext ? '「社内資料」として提示された参照資料に基づいて回答してください。' : null,
    hasLawContext
      ? '「法令情報」として提示された内容を引用する際は、必ず取得日と出典URLを明記してください。社内資料の内容と法令情報が矛盾する場合は両方を提示し、法改正への対応が必要な可能性を指摘してください。'
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const base =
    hasRagContext || hasLawContext
      ? `${contextNote}\n参照資料・法令情報にない情報は推測せず「登録された資料には記載がありません」と述べてください。`
      : '参照資料は登録されていません。一般的な日本の労働法令・人事慣行に基づいて回答してください。'

  const disclaimer = '重要: 最終的な判断は必ず人事責任者・社会保険労務士にご確認ください。'

  const modeInstructions: Record<AssistantMode, string> = {
    general: `あなたは人事担当者を支援する AI アシスタントです。
就業規則・労働法令・人事制度に関する質問に、簡潔かつ正確に回答してください。
${base}
回答の最後に必ず「${disclaimer}」を付記してください。`,

    labor_calc: `あなたは労務計算を支援する AI アシスタントです。
残業代・有休消化日数・深夜割増・法定外休日等の計算を行います。
計算に必要な情報（時給・月給・労働時間等）が不足していれば、具体的に聞き返してください。
計算根拠（労働基準法の条文等）を必ず示してください。
${base}
回答の最後に必ず「${disclaimer}」を付記してください。`,

    comment_review: `あなたは評価コメントの添削・改善提案を行う AI アシスタントです。
ユーザーが提示した評価コメントを以下の観点で分析し、改善案を提示してください：
1. 具体性（数字・事実に基づいているか）
2. 公平性（行動・成果に着目しているか）
3. 建設性（成長につながる表現か）
4. 法的リスク（差別・ハラスメントにつながる表現がないか）
改善前コメントと改善後コメントを並べて示してください。
${base}
回答の最後に必ず「${disclaimer}」を付記してください。`,

    case_search: `あなたは過去の人事相談ケースを検索・参照する AI アシスタントです。
ユーザーの質問に類似した過去の相談事例を参照資料から検索し、参考になる情報を抽出してください。
${base}
該当事例が見当たらない場合は「類似する登録ケースが見つかりませんでした」と述べてください。
回答の最後に必ず「${disclaimer}」を付記してください。`,
  }

  return modeInstructions[mode]
}
```

- [ ] **Step 7: actions.ts の RAG 検索を2系統に拡張**

`src/features/hr-assistant/actions.ts` の import に追加:

```typescript
import { formatLawContextBlocks, formatLawCitations } from './law-context'
import type { LawChunkRow } from './law-context'
```

`// RAG 検索（全モードで参照資料を活用）` セクション全体（`let citations: Citation[] = []` から `// 会話履歴の取得` の直前まで）を以下に置き換える:

```typescript
// RAG 検索（社内資料 + 法令ナレッジの2系統を並列実行、全モードで活用）
let citations: Citation[] = []
let citedIds: string[] = []
let contextBlocks: string[] = []
let hasLawContext = false

try {
  const queryEmbedding = await embedQueryText(message)
  const embeddingVector = formatVectorForPg(queryEmbedding)

  const [tenantResult, lawResult] = await Promise.all([
    supabase.rpc('match_tenant_rag_chunks', {
      query_embedding: embeddingVector,
      match_count: RAG_TOP_K,
    }),
    supabase.rpc('match_hr_law_chunks', {
      query_embedding: embeddingVector,
      match_count: 4,
    }),
  ])

  if (!tenantResult.error && tenantResult.data) {
    const rows = (tenantResult.data ?? []) as {
      id: string
      content: string
      metadata: { document_title?: string }
    }[]

    const tenantBlocks = rows.map((r, i) => {
      const title = r.metadata?.document_title || '文書'
      return `【社内資料${i + 1}: ${title}】\n${r.content}`
    })
    contextBlocks = [...contextBlocks, ...tenantBlocks]

    citations = [
      ...citations,
      ...rows.slice(0, 5).map(r => ({
        title: (r.metadata?.document_title as string) || '文書',
        snippet: r.content.slice(0, 200) + (r.content.length > 200 ? '…' : ''),
      })),
    ]
    citedIds = [...citedIds, ...rows.map(r => r.id)]
  } else if (tenantResult.error) {
    console.error('[hr-assistant] rag tenant', tenantResult.error)
  }

  if (!lawResult.error && lawResult.data) {
    const lawRows = (lawResult.data ?? []) as LawChunkRow[]
    if (lawRows.length > 0) {
      hasLawContext = true
      contextBlocks = [...contextBlocks, ...formatLawContextBlocks(lawRows)]
      citations = [...citations, ...formatLawCitations(lawRows)]
      citedIds = [...citedIds, ...lawRows.map(r => r.id)]
    }
  } else if (lawResult.error) {
    console.error('[hr-assistant] rag law', lawResult.error)
  }
} catch (e) {
  console.error('[hr-assistant] embedding/rag', e)
  // RAG 失敗は致命的でない。contextBlocks が空のまま続行。
}
```

次に `const systemPrompt = buildSystemPrompt(mode, contextBlocks.length > 0)` を以下に置き換える:

```typescript
const systemPrompt = buildSystemPrompt(mode, contextBlocks.length > 0, hasLawContext)
```

- [ ] **Step 8: MessageBubble.tsx で出典リンクを表示**

`src/features/hr-assistant/components/MessageBubble.tsx` の citations の `<li>` ブロックを以下に置き換える:

```tsx
{
  citations.map((c, i) => (
    <li key={i} className="text-xs text-[#57606a]">
      {c.sourceUrl ? (
        <a
          href={c.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#FD7601] hover:underline"
        >
          {c.title}
        </a>
      ) : (
        <span className="font-medium text-[#24292f]">{c.title}</span>
      )}
      {c.fetchedAt && (
        <span className="ml-1 text-[10px] text-[#57606a]">（取得日: {c.fetchedAt}）</span>
      )}
      <p className="text-[#57606a] line-clamp-1 mt-0.5">{c.snippet}</p>
    </li>
  ))
}
```

- [ ] **Step 9: 検証**

Run: `node --import tsx --test src/features/hr-assistant/law-context.test.ts`
Expected: PASS（5 tests）

Run: `npm run type-check && npm test`
Expected: 型エラーなし、全テスト PASS

- [ ] **Step 10: コミット**

```bash
git add src/features/hr-assistant/types.ts src/features/hr-assistant/prompts.ts src/features/hr-assistant/law-context.ts src/features/hr-assistant/law-context.test.ts src/features/hr-assistant/actions.ts src/features/hr-assistant/components/MessageBubble.tsx
git commit -m "feat: AI人事アシスタントに法令ナレッジRAGを統合し出典URL・取得日を表示"
```

---

### Task 3: Edge Function `hr-law-refresh`（週次収集バッチ）+ cron スケジュール

**Files:**

- Create: `supabase/functions/hr-law-refresh/chunk.ts`
- Create: `supabase/functions/hr-law-refresh/serpapi.ts`
- Create: `supabase/functions/hr-law-refresh/gemini.ts`
- Create: `supabase/functions/hr-law-refresh/mailer.ts`
- Create: `supabase/functions/hr-law-refresh/index.ts`
- Create: `supabase/migrations/<timestamp>_hr_law_refresh_cron.sql`（`supabase migration new hr_law_refresh_cron` で生成）
- Modify: `.env.example`

**Interfaces:**

- Consumes: `hr_law_sources` / `hr_law_documents` / `hr_law_chunks`（Task 1）
- Produces: HTTP エンドポイント `POST /functions/v1/hr-law-refresh`（body: `{ sourceId?: string }`。省略時は enabled な全ソースを対象、指定時はそのソースのみ実行）

このタスクは Supabase Edge Functions（Deno ランタイム）向けのコードであり、本プロジェクトの既存13関数と同様に自動テストは追加しない（Global Constraints 参照）。各ファイルは Deno.env への依存を持たない純粋な関数として設計し、`index.ts` でのみ環境変数を読み取ってこれらへ渡す。

- [ ] **Step 1: チャンク分割ロジックを移植**

`supabase/functions/hr-law-refresh/chunk.ts`:

```typescript
const CHUNK_MAX_CHARS = 900
const CHUNK_OVERLAP_CHARS = 100

/**
 * 日本語想定の単純チャンク分割（重複で文脈を保持）。
 * src/features/inquiry-chat/chunk.ts の chunkPlainText と同一ロジック
 * （Deno Edge Function は src/ を import できないため個別に保持する）。
 */
export function chunkPlainText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/ /g, ' ').trim()
  if (!normalized) return []

  const chunks: string[] = []
  let i = 0
  while (i < normalized.length) {
    let end = Math.min(i + CHUNK_MAX_CHARS, normalized.length)
    let slice = normalized.slice(i, end)

    if (end < normalized.length) {
      const relBreak = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        slice.lastIndexOf('。'),
        slice.lastIndexOf('．'),
        slice.lastIndexOf('. ')
      )
      if (relBreak > CHUNK_MAX_CHARS * 0.25) {
        slice = normalized.slice(i, i + relBreak + 1)
      }
    }

    const trimmed = slice.trim()
    if (trimmed.length > 0) chunks.push(trimmed)

    const step = Math.max(1, slice.length - CHUNK_OVERLAP_CHARS)
    i += step
  }

  return chunks
}

/** HTML から本文らしきテキストを粗く抽出する（script/style除去 + タグ除去 + 空白正規化） */
export function extractTextFromHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ')
  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return decoded
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
```

- [ ] **Step 2: SerpAPI 検索ロジック**

`supabase/functions/hr-law-refresh/serpapi.ts`:

```typescript
/** 収集対象を許可する公的ドメイン（末尾一致で判定） */
export const ALLOWED_DOMAINS = [
  'mhlw.go.jp',
  'jsite.mhlw.go.jp',
  'e-gov.go.jp',
  'nenkin.go.jp',
  'jil.go.jp',
]

export type SerpApiOrganicResult = {
  title: string
  link: string
  snippet?: string
}

/** 検索クエリに対する SerpAPI の organic_results 上位N件（許可ドメインのみ）を返す */
export async function searchSerpApi(
  apiKey: string,
  query: string,
  topN: number
): Promise<SerpApiOrganicResult[]> {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google')
  url.searchParams.set('q', query)
  url.searchParams.set('hl', 'ja')
  url.searchParams.set('gl', 'jp')
  url.searchParams.set('tbs', 'qdr:m') // 直近1ヶ月
  url.searchParams.set('api_key', apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`SerpAPI error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const results = (data.organic_results ?? []) as SerpApiOrganicResult[]

  return results
    .filter(r => {
      try {
        const host = new URL(r.link).hostname
        return ALLOWED_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))
      } catch {
        return false
      }
    })
    .slice(0, topN)
}

/** SerpAPI の残クエリ数を取得する（account.json エンドポイント） */
export async function getSerpApiSearchesLeft(apiKey: string): Promise<number | null> {
  const url = new URL('https://serpapi.com/account.json')
  url.searchParams.set('api_key', apiKey)
  const res = await fetch(url.toString())
  if (!res.ok) return null
  const data = await res.json()
  return typeof data.plan_searches_left === 'number' ? data.plan_searches_left : null
}
```

- [ ] **Step 3: Gemini REST クライアント（要約 + 埋め込み）**

`supabase/functions/hr-law-refresh/gemini.ts`:

```typescript
const GEMINI_FLASH_MODEL = 'gemini-2.5-flash'
const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSION = 1536

export type LawSummary = {
  title: string
  summary: string
  publishedAt: string | null
} | null

/**
 * 記事本文から構造化要約を生成する。
 * 施行日・対象企業・変更点・実務影響が不明確な場合は summary: null を返させ、
 * ハルシネーションを避ける（呼び出し側はその文書をスキップする）。
 */
export async function summarizeLawArticle(
  apiKey: string,
  title: string,
  sourceUrl: string,
  bodyText: string
): Promise<LawSummary> {
  const truncated = bodyText.slice(0, 6000)
  const systemInstruction =
    'あなたは日本の人事労務分野の専門家です。与えられた記事本文から、' +
    '人事担当者向けの要約を JSON で生成してください。' +
    '施行日・対象企業・変更点・実務影響の4点を含めてください。' +
    '本文からこれらの情報が読み取れない、または記事が法令改正と無関係な場合は、' +
    '必ず {"summary": null} だけを返してください（推測で埋めないこと）。' +
    '出力は次の JSON 形式のみ: {"summary": string | null, "publishedAt": "YYYY-MM-DD" | null}'

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `タイトル: ${title}\nURL: ${sourceUrl}\n\n本文:\n${truncated}` }],
      },
    ],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json',
    },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FLASH_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    throw new Error(`Gemini generateContent error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini から応答テキストが得られませんでした')

  let parsed: { summary?: string | null; publishedAt?: string | null }
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini の応答が JSON として解析できませんでした')
  }

  if (!parsed.summary) return null

  return {
    title,
    summary: parsed.summary,
    publishedAt: parsed.publishedAt ?? null,
  }
}

/** 複数チャンクの埋め込みベクトルを一括取得する（batchEmbedContents） */
export async function embedChunksBatch(apiKey: string, chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return []

  const requests = chunks.map(text => ({
    model: `models/${GEMINI_EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: EMBEDDING_DIMENSION,
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  )
  if (!res.ok) {
    throw new Error(`Gemini batchEmbedContents error (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const embeddings = data.embeddings as { values: number[] }[] | undefined
  if (!embeddings || embeddings.length !== chunks.length) {
    throw new Error('埋め込みバッチの件数が一致しません')
  }
  return embeddings.map(e => e.values)
}

/** Supabase / pgvector へ渡す文字列形式 */
export function formatVectorForPg(values: number[]): string {
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `埋め込み次元が一致しません: expected ${EMBEDDING_DIMENSION}, got ${values.length}`
    )
  }
  return `[${values.join(',')}]`
}
```

- [ ] **Step 4: SerpAPI 残量警告メール送信**

`supabase/functions/hr-law-refresh/mailer.ts`:

```typescript
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

/**
 * SerpAPI 残量警告メールを送信する（ベストエフォート）。
 * SMTP 未設定・送信失敗時は例外を投げず false を返す
 * （週次ジョブ本体を止めないため。呼び出し側で console.error する）。
 */
export async function sendQuotaWarningEmail(
  toEmail: string,
  searchesLeft: number
): Promise<boolean> {
  const host = Deno.env.get('SMTP_HOST')
  const port = Number(Deno.env.get('SMTP_PORT') ?? '587')
  const user = Deno.env.get('SMTP_USER')
  const pass = Deno.env.get('SMTP_PASS')

  if (!host) {
    console.error('[hr-law-refresh] SMTP_HOST 未設定のため警告メールをスキップしました')
    return false
  }

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      auth: user && pass ? { username: user, password: pass } : undefined,
      tls: port === 465,
    },
  })

  try {
    await client.send({
      from: user || 'noreply@hr-dx.jp',
      to: toEmail,
      subject: '【HR-DX】SerpAPI 残量が少なくなっています',
      content:
        `SerpAPI の残クエリ数が ${searchesLeft} 件になりました。\n` +
        '法令ナレッジ自動更新（hr-law-refresh）が正常に動作しなくなるおそれがあります。\n' +
        'SerpAPI の管理画面（https://serpapi.com/manage-api-key）でプランを確認してください。',
    })
    return true
  } catch (e) {
    console.error('[hr-law-refresh] 警告メール送信に失敗しました', e)
    return false
  } finally {
    await client.close()
  }
}
```

- [ ] **Step 5: メインオーケストレーション**

`supabase/functions/hr-law-refresh/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { chunkPlainText, extractTextFromHtml } from './chunk.ts'
import { searchSerpApi, getSerpApiSearchesLeft } from './serpapi.ts'
import { summarizeLawArticle, embedChunksBatch, formatVectorForPg } from './gemini.ts'
import { sendQuotaWarningEmail } from './mailer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** 1トピックあたりの検索結果上位件数 */
const RESULTS_PER_SOURCE = 3
/** 1回の実行で処理する最大トピック数（Edge Function の実行時間制限対策） */
const MAX_SOURCES_PER_RUN = 10
/** SerpAPI 残量警告の閾値 */
const SERPAPI_QUOTA_WARNING_THRESHOLD = 50

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const serpApiKey = Deno.env.get('SERPAPI_API_KEY') ?? ''
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    const alertEmail = Deno.env.get('SAAS_ALERT_EMAIL')

    if (!serpApiKey || !geminiApiKey) {
      throw new Error('SERPAPI_API_KEY または GEMINI_API_KEY が未設定です')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let body: { sourceId?: string } = {}
    try {
      body = await req.json()
    } catch {
      // body なしの呼び出し（cron からの空リクエスト）を許容
    }

    // SerpAPI 残量チェック（ラン継続を妨げない）
    try {
      const searchesLeft = await getSerpApiSearchesLeft(serpApiKey)
      if (searchesLeft != null && searchesLeft < SERPAPI_QUOTA_WARNING_THRESHOLD && alertEmail) {
        await sendQuotaWarningEmail(alertEmail, searchesLeft)
      }
    } catch (e) {
      console.error('[hr-law-refresh] SerpAPI 残量チェックに失敗しました', e)
    }

    let sourcesQuery = supabase
      .from('hr_law_sources')
      .select('id, topic, search_query')
      .eq('enabled', true)

    if (body.sourceId) {
      sourcesQuery = sourcesQuery.eq('id', body.sourceId)
    } else {
      sourcesQuery = sourcesQuery.limit(MAX_SOURCES_PER_RUN)
    }

    const { data: sources, error: sourcesError } = await sourcesQuery
    if (sourcesError) throw sourcesError

    let documentsCreated = 0
    let documentsSkipped = 0
    const errors: string[] = []

    for (const source of sources ?? []) {
      try {
        const results = await searchSerpApi(serpApiKey, source.search_query, RESULTS_PER_SOURCE)

        for (const result of results) {
          try {
            const pageRes = await fetch(result.link)
            if (!pageRes.ok) {
              documentsSkipped++
              continue
            }
            const html = await pageRes.text()
            const bodyText = extractTextFromHtml(html)
            if (bodyText.length < 100) {
              documentsSkipped++
              continue
            }

            const contentHash = await sha256Hex(bodyText)

            const { data: existing } = await supabase
              .from('hr_law_documents')
              .select('id')
              .eq('content_hash', contentHash)
              .maybeSingle()

            if (existing) {
              documentsSkipped++
              continue
            }

            const summary = await summarizeLawArticle(
              geminiApiKey,
              result.title,
              result.link,
              bodyText
            )
            if (!summary) {
              documentsSkipped++
              continue
            }

            const { data: doc, error: docError } = await supabase
              .from('hr_law_documents')
              .insert({
                source_id: source.id,
                title: summary.title,
                source_url: result.link,
                content_hash: contentHash,
                summary: summary.summary,
                published_at: summary.publishedAt,
              })
              .select('id, fetched_at')
              .single()

            if (docError || !doc) {
              errors.push(`${source.topic}: 文書登録失敗 ${docError?.message}`)
              continue
            }

            const chunks = chunkPlainText(summary.summary)
            if (chunks.length === 0) {
              documentsCreated++
              continue
            }

            const embeddings = await embedChunksBatch(geminiApiKey, chunks)
            const chunkRows = chunks.map((content, i) => ({
              document_id: doc.id,
              chunk_index: i,
              content,
              embedding: formatVectorForPg(embeddings[i]),
              metadata: {
                document_title: summary.title,
                source_url: result.link,
                fetched_at: doc.fetched_at,
              },
            }))

            const { error: chunkError } = await supabase.from('hr_law_chunks').insert(chunkRows)
            if (chunkError) {
              errors.push(`${source.topic}: チャンク登録失敗 ${chunkError.message}`)
              continue
            }

            documentsCreated++
          } catch (e) {
            errors.push(`${source.topic}: ${e instanceof Error ? e.message : String(e)}`)
          }
        }

        await supabase
          .from('hr_law_sources')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', source.id)
      } catch (e) {
        errors.push(`${source.topic}: 検索失敗 ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sourcesProcessed: (sources ?? []).length,
        documentsCreated,
        documentsSkipped,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
```

- [ ] **Step 6: cron スケジュール マイグレーションを作成**

Run: `supabase migration new hr_law_refresh_cron`

生成されたファイルに以下を記述:

```sql
-- 毎週月曜 6:00 JST（UTC 前週日曜 21:00）に法令ナレッジ自動更新を実行
SELECT cron.schedule(
  'hr-law-refresh',
  '0 21 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/hr-law-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  )
  $$
);
```

- [ ] **Step 7: マイグレーションを適用**

Run: `supabase migration up`
Expected: エラーなく適用完了

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT jobname, schedule FROM cron.job WHERE jobname = 'hr-law-refresh';"`
Expected: 1行返る（schedule = `0 21 * * 0`）

- [ ] **Step 8: `.env.example` に環境変数を追記**

`.env.example` の SerpAPI の項目の直後に追記:

```
# SaaS管理者向けアラート送信先（例: SerpAPI残量警告）。hr-law-refresh Edge Function で使用
SAAS_ALERT_EMAIL=
```

- [ ] **Step 9: ローカルでの手動実行検証（Supabase CLI 経由）**

Run: `supabase functions serve hr-law-refresh --no-verify-jwt`（別ターミナルで起動しておく）

Run:

```bash
curl -X POST http://127.0.0.1:55421/functions/v1/hr-law-refresh \
  -H "Authorization: Bearer $(supabase status -o json | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).SERVICE_ROLE_KEY')" \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "'$(psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -tAc "SELECT id FROM hr_law_sources WHERE topic = '"'"'最低賃金'"'"' LIMIT 1")'"}'
```

Expected: `{"success":true, ...}` が返る（SERPAPI_API_KEY / GEMINI_API_KEY がローカル `supabase/.env` に設定されている前提。未設定の場合は 500 エラーになるため、`supabase/.env` に追記してから再実行する）

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT title, source_url, status FROM hr_law_documents;"`
Expected: 0件以上の行（SerpAPI/Gemini が実データを返せば1件以上登録される。外部APIの応答内容に依存するため0件でも失敗ではない。その場合はレスポンスの `errors` 配列を確認する）

- [ ] **Step 10: コミット**

```bash
git add supabase/functions/hr-law-refresh/ supabase/migrations/*_hr_law_refresh_cron.sql .env.example
git commit -m "feat: 法令ナレッジ週次自動収集Edge Function（SerpAPI+Gemini）とcronスケジュールを追加"
```

---

### Task 4: SaaS管理者向け法令ナレッジ管理画面

**Files:**

- Create: `src/features/saas-law-knowledge/types.ts`
- Create: `src/features/saas-law-knowledge/queries.ts`
- Create: `src/features/saas-law-knowledge/actions.ts`
- Create: `src/features/saas-law-knowledge/components/LawDocumentTable.tsx`
- Create: `src/features/saas-law-knowledge/components/LawSourceList.tsx`
- Create: `src/app/(saas-admin)/saas_adm/hr-law-knowledge/page.tsx`
- Create: `src/app/(saas-admin)/saas_adm/hr-law-knowledge/loading.tsx`
- Modify: `src/config/routes.ts`

**Interfaces:**

- Consumes: `hr_law_sources` / `hr_law_documents`（Task 1）、Edge Function `hr-law-refresh`（Task 3）
- Produces: ルート `/saas_adm/hr-law-knowledge`

- [ ] **Step 1: routes.ts にルートを追加**

`src/config/routes.ts` の `SAAS` オブジェクト内、`EVAL_GLOBAL_TEMPLATE_DETAIL` の直後に追加:

```typescript
    /** 法令ナレッジ自動更新の管理（収集文書一覧・無効化・手動再実行） */
    HR_LAW_KNOWLEDGE: '/saas_adm/hr-law-knowledge',
```

- [ ] **Step 2: 型を定義**

`src/features/saas-law-knowledge/types.ts`:

```typescript
export type HrLawSource = {
  id: string
  topic: string
  search_query: string
  enabled: boolean
  last_run_at: string | null
  created_at: string
}

export type HrLawDocument = {
  id: string
  source_id: string | null
  title: string
  source_url: string
  summary: string
  published_at: string | null
  fetched_at: string
  status: 'published' | 'disabled'
  topic: string | null
}

export type RefreshActionResult =
  | { ok: true; documentsCreated: number; documentsSkipped: number; errors: string[] }
  | { ok: false; error: string }
```

- [ ] **Step 3: クエリを実装**

`src/features/saas-law-knowledge/queries.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import type { HrLawSource, HrLawDocument } from './types'

async function isSaasAdmin(): Promise<boolean> {
  const user = await getServerUser()
  return !!user && (user.role === 'supaUser' || user.appRole === 'developer')
}

/** 監視トピック一覧（SaaS管理者専用） */
export async function listHrLawSources(): Promise<HrLawSource[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('hr_law_sources')
    .select('id, topic, search_query, enabled, last_run_at, created_at')
    .order('topic', { ascending: true })

  if (error) {
    console.error('[saas-law-knowledge] listHrLawSources', error)
    return []
  }
  return (data ?? []) as HrLawSource[]
}

/** 収集済み文書一覧（新しい順、トピック名を結合。SaaS管理者専用） */
export async function listHrLawDocuments(): Promise<HrLawDocument[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('hr_law_documents')
    .select(
      'id, source_id, title, source_url, summary, published_at, fetched_at, status, hr_law_sources(topic)'
    )
    .order('fetched_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[saas-law-knowledge] listHrLawDocuments', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    source_id: row.source_id,
    title: row.title,
    source_url: row.source_url,
    summary: row.summary,
    published_at: row.published_at,
    fetched_at: row.fetched_at,
    status: row.status,
    topic: row.hr_law_sources?.topic ?? null,
  })) as HrLawDocument[]
}
```

- [ ] **Step 4: アクションを実装**

`src/features/saas-law-knowledge/actions.ts`:

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { RefreshActionResult } from './types'

async function getSaasAdminUser() {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) return null
  return user
}

/** 文書を無効化/再公開する（status のトグル） */
export async function toggleHrLawDocumentStatus(
  documentId: string,
  nextStatus: 'published' | 'disabled'
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('hr_law_documents')
    .update({ status: nextStatus })
    .eq('id', documentId)

  if (error) {
    console.error('[saas-law-knowledge] toggleHrLawDocumentStatus', error)
    return { ok: false, error: '更新に失敗しました' }
  }

  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** 指定トピックの法令ナレッジ収集を手動実行する（Edge Function を直接呼び出す） */
export async function triggerHrLawRefresh(sourceId: string): Promise<RefreshActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: 'Supabase の接続情報が未設定です' }
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/hr-law-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sourceId }),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      return { ok: false, error: data.error ?? `実行に失敗しました (${res.status})` }
    }

    revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
    return {
      ok: true,
      documentsCreated: data.documentsCreated ?? 0,
      documentsSkipped: data.documentsSkipped ?? 0,
      errors: data.errors ?? [],
    }
  } catch (e) {
    console.error('[saas-law-knowledge] triggerHrLawRefresh', e)
    return { ok: false, error: '実行リクエストに失敗しました' }
  }
}
```

- [ ] **Step 5: 文書一覧テーブルを実装**

`src/features/saas-law-knowledge/components/LawDocumentTable.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { toggleHrLawDocumentStatus } from '../actions'
import type { HrLawDocument } from '../types'

type Props = {
  documents: HrLawDocument[]
}

export function LawDocumentTable({ documents }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  function handleToggle(doc: HrLawDocument) {
    const nextStatus = doc.status === 'published' ? 'disabled' : 'published'
    setPendingId(doc.id)
    startTransition(async () => {
      await toggleHrLawDocumentStatus(doc.id, nextStatus)
      setPendingId(null)
    })
  }

  const columns: Column<HrLawDocument>[] = [
    {
      key: 'title',
      label: 'タイトル',
      render: (value: string, item) => (
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--brand) hover:underline"
        >
          {value}
        </a>
      ),
    },
    {
      key: 'topic',
      label: 'トピック',
      render: (value: string | null) => value ?? '—',
    },
    {
      key: 'status',
      label: 'ステータス',
      render: (value: 'published' | 'disabled') =>
        value === 'published' ? '公開中' : '無効化済み',
    },
    {
      key: 'fetched_at',
      label: '取得日時',
      render: (value: string) => format(new Date(value), 'M/d (E) HH:mm', { locale: ja }),
    },
    {
      key: 'id',
      label: '操作',
      render: (_value: string, item) => (
        <button
          type="button"
          disabled={isPending && pendingId === item.id}
          onClick={() => handleToggle(item)}
          className="text-xs font-medium text-(--brand) hover:underline disabled:opacity-50"
        >
          {item.status === 'published' ? '無効化' : '再公開'}
        </button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={documents}
      searchable
      searchKey="title"
      getRowId={item => item.id}
    />
  )
}
```

- [ ] **Step 6: トピック一覧 + 手動再実行ボタンを実装**

`src/features/saas-law-knowledge/components/LawSourceList.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { triggerHrLawRefresh } from '../actions'
import type { HrLawSource } from '../types'

type Props = {
  sources: HrLawSource[]
}

export function LawSourceList({ sources }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function handleRun(source: HrLawSource) {
    setPendingId(source.id)
    setMessage(null)
    startTransition(async () => {
      const result = await triggerHrLawRefresh(source.id)
      if (result.ok) {
        setMessage(
          `${source.topic}: ${result.documentsCreated}件登録・${result.documentsSkipped}件スキップ`
        )
      } else {
        setMessage(`${source.topic}: 失敗 — ${result.error}`)
      }
      setPendingId(null)
    })
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-xs rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-2 text-[#24292f]">
          {message}
        </p>
      )}
      <ul className="divide-y divide-[#e2e6ec] rounded-lg border border-[#e2e6ec] bg-white">
        {sources.map(source => (
          <li key={source.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#24292f]">{source.topic}</p>
              <p className="text-xs text-[#57606a] mt-0.5">
                最終実行:{' '}
                {source.last_run_at
                  ? format(new Date(source.last_run_at), 'M/d (E) HH:mm', { locale: ja })
                  : '未実行'}
              </p>
            </div>
            <button
              type="button"
              disabled={isPending && pendingId === source.id}
              onClick={() => handleRun(source)}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e2e6ec] text-[#24292f] hover:border-[#FD7601] hover:text-[#FD7601] disabled:opacity-50"
            >
              {isPending && pendingId === source.id ? '実行中…' : '手動実行'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 7: ページを実装**

`src/app/(saas-admin)/saas_adm/hr-law-knowledge/page.tsx`:

```tsx
import { listHrLawSources, listHrLawDocuments } from '@/features/saas-law-knowledge/queries'
import { LawSourceList } from '@/features/saas-law-knowledge/components/LawSourceList'
import { LawDocumentTable } from '@/features/saas-law-knowledge/components/LawDocumentTable'

export default async function HrLawKnowledgePage() {
  const [sources, documents] = await Promise.all([listHrLawSources(), listHrLawDocuments()])

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-300 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold">法令ナレッジ自動更新管理</h1>
      </div>
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-[#57606a]">監視トピック</h2>
        <LawSourceList sources={sources} />
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-[#57606a]">収集済み文書</h2>
        <LawDocumentTable documents={documents} />
      </section>
    </div>
  )
}
```

- [ ] **Step 8: loading.tsx を追加**

`src/app/(saas-admin)/saas_adm/hr-law-knowledge/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-300">
      <p className="text-sm text-[#57606a]">読み込み中…</p>
    </div>
  )
}
```

- [ ] **Step 9: 検証**

Run: `npm run type-check && npm test`
Expected: 型エラーなし、全テスト PASS

Run: `npm run dev` → ブラウザで `/saas_adm/hr-law-knowledge` を開く（`wada007@gmail.com` = developer ロールでログイン）
Expected:

1. 監視トピック8件が一覧表示される
2. Task 3 の Step 9 で登録した文書がある場合、収集済み文書テーブルに表示される
3. 文書の「無効化」ボタンをクリックするとステータスが「無効化済み」に変わる
4. 「無効化済み」の文書が `/adm/hr-assistant` の法令RAG検索結果に出てこないことを確認する（`match_hr_law_chunks` の `status = 'published'` フィルタが効いている）

- [ ] **Step 10: コミット**

```bash
git add src/features/saas-law-knowledge/ "src/app/(saas-admin)/saas_adm/hr-law-knowledge/" src/config/routes.ts
git commit -m "feat: SaaS管理者向け法令ナレッジ管理画面を追加（一覧・無効化・手動再実行）"
```

---

## 補足

- Task 3 の外部API呼び出し（SerpAPI・Gemini・SMTP）はローカル環境の `SERPAPI_API_KEY` / `GEMINI_API_KEY` / `SMTP_*` 設定に依存する。未設定の場合、Step 9 の手動実行検証はエラーになるため、`supabase/.env`（Edge Functions 用のローカル環境変数ファイル。無ければ作成する）に値を設定してから実行する
- 本番デプロイ時は `supabase secrets set SERPAPI_API_KEY=... GEMINI_API_KEY=... SAAS_ALERT_EMAIL=wada007@gmail.com SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=...` の実行が別途必要（本計画のスコープ外の運用作業）
- `denomailer` のバージョン（`1.6.0`）は実装時に `https://deno.land/x/denomailer` の最新安定版を確認し、必要なら差し替える
- Phase 3（テンプレートマイニング + ダッシュボードカード + フィードバック機能）は本計画の完了後、別の実装計画を作成する（PRD 4章参照）
