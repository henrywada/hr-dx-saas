# AI人事アシスタント Phase 1: 質問テンプレートチップ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/adm/hr-assistant` のチャット空状態に「💡 こんな質問はありませんか？」テンプレートチップを表示し、クリックで即質問送信・利用回数を記録する。

**Architecture:** 新テーブル `tenant_hr_assistant_templates`（tenant_id NULL = 全テナント共通 seed）+ RLS + usage_count 加算用 SECURITY DEFINER RPC。表示選定は純関数 `selectTemplatesForDisplay`（mined 優先 → seed 補完、usage_count 降順、重複排除、6 件）。page.tsx で SELECT → Props 経由で ChatPanel に渡す（プロジェクトのデータアクセスパターン厳守）。

**Tech Stack:** Next.js 16 App Router / Supabase (RLS, RPC) / node:test + tsx

**Spec:** `docs/implementation-plan-ai-hr-assistant-evolution.md`（PRD）の Phase 1 部分

## Global Constraints

- コードコメントは日本語で記述する
- テナント向け `actions.ts` で `createAdminClient()` を使わない（本計画は `createClient()` のみ）
- `supabase db reset` は絶対に実行しない。適用は `supabase migration up`
- テストは `node --import tsx --test`（`npm test`、glob は `src/**/*.test.ts`）
- カラーは既存 hr-assistant コンポーネントと同じトークン（`#e2e6ec`, `#57606a`, `#24292f`, `#FD7601`, `#f6f8fa`）を使用
- TypeScript は strict: false（現状維持）。パスエイリアス `@/*` → `./src/*`
- inquiry-chat（従業員向けお問合せ）には一切変更を加えない

---

### Task 1: マイグレーション（テーブル + RLS + RPC + seed 20 件）

**Files:**

- Create: `supabase/migrations/20260709100000_hr_assistant_templates.sql`

**Interfaces:**

- Produces: テーブル `public.tenant_hr_assistant_templates`、RPC `increment_hr_template_usage(p_template_id uuid)`（authenticated が実行可）

- [ ] **Step 1: マイグレーションファイルを作成**

`supabase migration new hr_assistant_templates` を実行し、生成されたファイルに以下を記述（ファイル名のタイムスタンプは生成されたものを使う）:

```sql
-- =============================================================================
-- AI人事アシスタント: 質問テンプレート（Phase 1）
-- tenant_id が NULL の行は全テナント共通の seed テンプレート。
-- mined（週次マイニング生成）は Phase 3 で service_role が書き込む。
-- =============================================================================

CREATE TABLE public.tenant_hr_assistant_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  mode          text NOT NULL DEFAULT 'general'
                CHECK (mode IN ('general', 'labor_calc', 'comment_review', 'case_search')),
  question_text text NOT NULL,
  source        text NOT NULL DEFAULT 'seed' CHECK (source IN ('seed', 'mined')),
  usage_count   int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_hr_assistant_templates_tenant_idx
  ON public.tenant_hr_assistant_templates(tenant_id, mode, status);

ALTER TABLE public.tenant_hr_assistant_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: 共通 seed（tenant_id IS NULL）または自テナントの行のみ
CREATE POLICY "hr_assistant_templates_select" ON public.tenant_hr_assistant_templates
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- 書き込みポリシーは作らない（seed はマイグレーション、mined は service_role が担う。
-- usage_count の加算のみ下記 RPC で許可する）

-- usage_count 加算専用 RPC（行全体の UPDATE 権限を与えないため SECURITY DEFINER）
CREATE OR REPLACE FUNCTION public.increment_hr_template_usage(p_template_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.tenant_hr_assistant_templates
  SET usage_count = usage_count + 1,
      updated_at  = now()
  WHERE id = p_template_id
    AND status = 'active'
    AND (
      tenant_id IS NULL
      OR tenant_id = (
        SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.increment_hr_template_usage(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_hr_template_usage(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- seed テンプレート 20 件（general 8 / labor_calc 6 / comment_review 3 / case_search 3）
-- ---------------------------------------------------------------------------
INSERT INTO public.tenant_hr_assistant_templates (tenant_id, mode, question_text, source) VALUES
  (NULL, 'general', '有給休暇の付与日数と繰越ルールを教えてください', 'seed'),
  (NULL, 'general', '従業員が退職する際に会社が行う手続きの一覧を教えてください', 'seed'),
  (NULL, 'general', '試用期間中の解雇にはどのような制約がありますか？', 'seed'),
  (NULL, 'general', '育児休業の取得条件と期間について教えてください', 'seed'),
  (NULL, 'general', '就業規則を変更する場合の手続きと注意点を教えてください', 'seed'),
  (NULL, 'general', '副業を許可する場合に整備すべき社内ルールを教えてください', 'seed'),
  (NULL, 'general', '休職中の従業員が復職する際の対応手順を教えてください', 'seed'),
  (NULL, 'general', 'ハラスメント相談を受けた際の初動対応を教えてください', 'seed'),
  (NULL, 'labor_calc', '月給30万円・所定労働時間160時間の場合の残業単価を計算してください', 'seed'),
  (NULL, 'labor_calc', '深夜残業の割増率と計算方法を教えてください', 'seed'),
  (NULL, 'labor_calc', '法定休日と所定休日の割増賃金の違いを計算例つきで教えてください', 'seed'),
  (NULL, 'labor_calc', '入社3年目・週5日勤務の従業員の有給付与日数を計算してください', 'seed'),
  (NULL, 'labor_calc', '欠勤控除の一般的な計算方法を教えてください', 'seed'),
  (NULL, 'labor_calc', '36協定の上限時間（月45時間・年360時間）の考え方を教えてください', 'seed'),
  (NULL, 'comment_review', '評価コメント「よく頑張っていた」を具体的な表現に添削してください', 'seed'),
  (NULL, 'comment_review', '低評価を伝えるコメントを建設的な表現に改善してください', 'seed'),
  (NULL, 'comment_review', 'この評価コメントに法的リスクのある表現がないか確認してください', 'seed'),
  (NULL, 'case_search', '遅刻を繰り返す従業員への対応事例はありますか？', 'seed'),
  (NULL, 'case_search', 'メンタル不調の従業員への対応事例を探しています', 'seed'),
  (NULL, 'case_search', '賃金に関する従業員からの不満への対応事例はありますか？', 'seed');
```

- [ ] **Step 2: マイグレーションを適用して検証**

Run: `supabase migration up`
Expected: エラーなく適用完了

Run: `psql postgresql://postgres:postgres@127.0.0.1:55422/postgres -c "SELECT mode, count(*) FROM tenant_hr_assistant_templates GROUP BY mode ORDER BY mode;"`
Expected:

```
 comment_review | 3
 case_search    | 3
 general        | 8
 labor_calc     | 6
```

- [ ] **Step 3: 型定義を再生成**

Run: `supabase gen types typescript --local > src/lib/supabase/types.ts`
Expected: `tenant_hr_assistant_templates` と `increment_hr_template_usage` が types.ts に含まれる（`grep -c "tenant_hr_assistant_templates" src/lib/supabase/types.ts` が 1 以上）

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/*_hr_assistant_templates.sql src/lib/supabase/types.ts
git commit -m "feat: AI人事アシスタントの質問テンプレートテーブルとseed20件を追加"
```

---

### Task 2: 表示選定ロジック（純関数・TDD）

**Files:**

- Modify: `src/features/hr-assistant/types.ts`（末尾に型を追加）
- Create: `src/features/hr-assistant/template-select.ts`
- Test: `src/features/hr-assistant/template-select.test.ts`

**Interfaces:**

- Produces:
  - `QuestionTemplate` 型（types.ts）
  - `selectTemplatesForDisplay(templates: QuestionTemplate[], mode: AssistantMode, limit?: number): QuestionTemplate[]`（デフォルト limit = 6）

- [ ] **Step 1: 型を追加**

`src/features/hr-assistant/types.ts` の末尾に追加:

```typescript
/** 質問テンプレート（tenant_id が null の行は全テナント共通 seed） */
export type QuestionTemplate = {
  id: string
  tenant_id: string | null
  mode: AssistantMode
  question_text: string
  source: 'seed' | 'mined'
  usage_count: number
  status: 'active' | 'archived'
  created_at: string
}
```

- [ ] **Step 2: 失敗するテストを書く**

`src/features/hr-assistant/template-select.test.ts`:

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'

import { selectTemplatesForDisplay } from './template-select'
import type { QuestionTemplate } from './types'

function makeTemplate(overrides: Partial<QuestionTemplate>): QuestionTemplate {
  return {
    id: 't-1',
    tenant_id: null,
    mode: 'general',
    question_text: '質問',
    source: 'seed',
    usage_count: 0,
    status: 'active',
    created_at: '2026-07-01T00:00:00Z',
    ...overrides,
  }
}

test('mined テンプレートを seed より優先して返す', () => {
  const templates = [
    makeTemplate({ id: 's1', source: 'seed', question_text: 'seed質問', usage_count: 100 }),
    makeTemplate({ id: 'm1', source: 'mined', question_text: 'mined質問', usage_count: 1 }),
  ]
  const result = selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    result.map(t => t.id),
    ['m1', 's1']
  )
})

test('同一 source 内は usage_count 降順で並べる', () => {
  const templates = [
    makeTemplate({ id: 'a', question_text: 'A', usage_count: 1 }),
    makeTemplate({ id: 'b', question_text: 'B', usage_count: 5 }),
    makeTemplate({ id: 'c', question_text: 'C', usage_count: 3 }),
  ]
  const result = selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    result.map(t => t.id),
    ['b', 'c', 'a']
  )
})

test('指定モード以外と archived を除外する', () => {
  const templates = [
    makeTemplate({ id: 'g1', mode: 'general', question_text: 'G' }),
    makeTemplate({ id: 'l1', mode: 'labor_calc', question_text: 'L' }),
    makeTemplate({ id: 'g2', mode: 'general', question_text: 'G2', status: 'archived' }),
  ]
  const result = selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    result.map(t => t.id),
    ['g1']
  )
})

test('question_text が重複する場合は先勝ちで排除する', () => {
  const templates = [
    makeTemplate({ id: 'm1', source: 'mined', question_text: '同じ質問' }),
    makeTemplate({ id: 's1', source: 'seed', question_text: '同じ質問' }),
  ]
  const result = selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    result.map(t => t.id),
    ['m1']
  )
})

test('limit 件数（デフォルト 6）に切り詰める', () => {
  const templates = Array.from({ length: 10 }, (_, i) =>
    makeTemplate({ id: `t${i}`, question_text: `質問${i}` })
  )
  assert.equal(selectTemplatesForDisplay(templates, 'general').length, 6)
  assert.equal(selectTemplatesForDisplay(templates, 'general', 3).length, 3)
})

test('入力配列を変更しない（イミュータブル）', () => {
  const templates = [
    makeTemplate({ id: 'a', question_text: 'A', usage_count: 1 }),
    makeTemplate({ id: 'b', question_text: 'B', usage_count: 5 }),
  ]
  const before = templates.map(t => t.id)
  selectTemplatesForDisplay(templates, 'general')
  assert.deepEqual(
    templates.map(t => t.id),
    before
  )
})
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `node --import tsx --test src/features/hr-assistant/template-select.test.ts`
Expected: FAIL（`Cannot find module './template-select'`）

- [ ] **Step 4: 実装を書く**

`src/features/hr-assistant/template-select.ts`:

```typescript
import type { AssistantMode, QuestionTemplate } from './types'

/** チップとして一度に表示するテンプレート数 */
const DEFAULT_DISPLAY_LIMIT = 6

/**
 * 表示するテンプレートを選定する。
 * 優先順位: mined（自テナントの学習結果）> seed（共通）、各グループ内は usage_count 降順。
 * question_text の重複は先勝ちで排除し、limit 件に切り詰める。
 */
export function selectTemplatesForDisplay(
  templates: QuestionTemplate[],
  mode: AssistantMode,
  limit: number = DEFAULT_DISPLAY_LIMIT
): QuestionTemplate[] {
  const candidates = templates.filter(t => t.mode === mode && t.status === 'active')

  // filter が返す新しい配列を sort するため、入力配列は変更されない
  const byUsageDesc = (a: QuestionTemplate, b: QuestionTemplate) =>
    b.usage_count - a.usage_count || a.created_at.localeCompare(b.created_at)
  const mined = candidates.filter(t => t.source === 'mined').sort(byUsageDesc)
  const seed = candidates.filter(t => t.source === 'seed').sort(byUsageDesc)

  const seen = new Set<string>()
  const result: QuestionTemplate[] = []
  for (const t of [...mined, ...seed]) {
    if (seen.has(t.question_text)) continue
    seen.add(t.question_text)
    result.push(t)
    if (result.length >= limit) break
  }
  return result
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `node --import tsx --test src/features/hr-assistant/template-select.test.ts`
Expected: PASS（6 tests）

Run: `npm test`
Expected: 既存テスト含め全 PASS

- [ ] **Step 6: コミット**

```bash
git add src/features/hr-assistant/types.ts src/features/hr-assistant/template-select.ts src/features/hr-assistant/template-select.test.ts
git commit -m "feat: 質問テンプレートの表示選定ロジックを追加（mined優先・usage_count降順・重複排除）"
```

---

### Task 3: クエリと利用記録 Server Action

**Files:**

- Modify: `src/features/hr-assistant/queries.ts`（末尾に関数追加）
- Modify: `src/features/hr-assistant/actions.ts`（末尾に関数追加）

**Interfaces:**

- Consumes: `QuestionTemplate` 型（Task 2）、RPC `increment_hr_template_usage`（Task 1）
- Produces:
  - `listQuestionTemplates(): Promise<QuestionTemplate[]>`（queries.ts — Server Component 用）
  - `recordTemplateUsage(templateId: string): Promise<void>`（actions.ts — Client 用、失敗しても throw しない）

- [ ] **Step 1: queries.ts に取得関数を追加**

`src/features/hr-assistant/queries.ts` の import に `QuestionTemplate` を追加し、末尾に追加:

```typescript
/** 質問テンプレート一覧（共通 seed + 自テナント mined。スコープは RLS が担保） */
export async function listQuestionTemplates(): Promise<QuestionTemplate[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_hr_assistant_templates')
    .select('id, tenant_id, mode, question_text, source, usage_count, status, created_at')
    .eq('status', 'active')
    .order('usage_count', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[hr-assistant] listQuestionTemplates', error)
    return []
  }
  return (data ?? []) as QuestionTemplate[]
}
```

import 行の変更:

```typescript
import type { HrAssistantSession, HrAssistantMessage, QuestionTemplate } from './types'
```

- [ ] **Step 2: actions.ts に利用記録アクションを追加**

`src/features/hr-assistant/actions.ts` の末尾に追加:

```typescript
/**
 * テンプレートチップの利用回数を記録する。
 * 計測用途のため、失敗してもチャット体験を阻害しない（throw しない）。
 */
export async function recordTemplateUsage(templateId: string): Promise<void> {
  const user = await getServerUser()
  if (!user?.tenant_id || !templateId) return

  const supabase = await createClient()
  const { error } = await supabase.rpc('increment_hr_template_usage', {
    p_template_id: templateId,
  })
  if (error) {
    console.error('[hr-assistant] recordTemplateUsage', error)
  }
}
```

- [ ] **Step 3: 型チェック**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/features/hr-assistant/queries.ts src/features/hr-assistant/actions.ts
git commit -m "feat: 質問テンプレートの取得クエリと利用記録アクションを追加"
```

---

### Task 4: UI（チップコンポーネント + ChatPanel/page 統合）

**Files:**

- Create: `src/features/hr-assistant/components/QuestionTemplateChips.tsx`
- Modify: `src/features/hr-assistant/components/ChatPanel.tsx`
- Modify: `src/features/hr-assistant/components/HrAssistantClient.tsx`
- Modify: `src/app/(tenant)/(tenant-admin)/adm/(ai_agent)/hr-assistant/page.tsx`

**Interfaces:**

- Consumes: `selectTemplatesForDisplay`（Task 2）、`listQuestionTemplates` / `recordTemplateUsage`（Task 3）
- Produces: `QuestionTemplateChips`（props: `{ templates, mode, disabled, onSelect(template) }`）

- [ ] **Step 1: QuestionTemplateChips.tsx を作成**

```tsx
'use client'

import { selectTemplatesForDisplay } from '../template-select'
import type { AssistantMode, QuestionTemplate } from '../types'

type Props = {
  templates: QuestionTemplate[]
  mode: AssistantMode
  disabled: boolean
  onSelect: (template: QuestionTemplate) => void
}

/** チャット空状態に表示する「こんな質問はありませんか？」チップ */
export function QuestionTemplateChips({ templates, mode, disabled, onSelect }: Props) {
  const displayed = selectTemplatesForDisplay(templates, mode)
  if (displayed.length === 0) return null

  return (
    <div className="w-full max-w-lg text-left">
      <p className="text-xs font-semibold text-[#57606a] mb-2">💡 こんな質問はありませんか？</p>
      <div className="flex flex-wrap gap-2">
        {displayed.map(t => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(t)}
            className="text-left text-xs text-[#24292f] bg-white border border-[#e2e6ec] rounded-lg px-3 py-2 hover:border-[#FD7601] hover:text-[#FD7601] transition-colors disabled:opacity-50"
          >
            {t.question_text}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ChatPanel.tsx を変更（送信ロジック抽出 + チップ統合）**

変更点は 3 箇所。

(a) import と Props に追加:

```tsx
import { QuestionTemplateChips } from './QuestionTemplateChips'
import { sendHrAssistantMessage, recordTemplateUsage } from '../actions'
import type { AssistantMode, HrAssistantMessage, Citation, QuestionTemplate } from '../types'
```

```tsx
type Props = {
  sessionId: string | null
  initialMessages: HrAssistantMessage[]
  initialMode: AssistantMode
  templates: QuestionTemplate[]
  onSessionCreated: (sessionId: string, mode: AssistantMode, title: string) => void
}
```

関数シグネチャも `templates` を受け取るよう変更:

```tsx
export function ChatPanel({ sessionId, initialMessages, initialMode, templates, onSessionCreated }: Props) {
```

(b) `handleSubmit` から送信処理を `sendMessage(text)` に抽出し、チップクリック用ハンドラを追加。既存の `handleSubmit` 本体（`const userMessage = ...` 以降すべて）を `sendMessage` に移し、次の形にする:

```tsx
async function sendMessage(text: string) {
  const userMessage = text.trim()
  if (!userMessage || loading) return

  setInput('')
  setLoading(true)
  setError(null)

  const optimisticUser: LocalMessage = {
    id: `optimistic-${Date.now()}`,
    role: 'user',
    content: userMessage,
    mode,
    cited_chunk_ids: null,
    metadata: {},
    created_at: new Date().toISOString(),
  }
  setMessages(prev => [...prev, optimisticUser])

  const res = await sendHrAssistantMessage({
    sessionId: currentSessionId.current,
    message: userMessage,
    mode,
  })

  setLoading(false)

  if (res.ok === false) {
    setError(res.error)
    setMessages(prev => prev.filter(m => m.id !== optimisticUser.id))
    return
  }

  if (!currentSessionId.current) {
    currentSessionId.current = res.sessionId
    onSessionCreated(res.sessionId, mode, userMessage.slice(0, 80))
  }

  const assistantMessage: LocalMessage = {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: res.answer,
    mode,
    cited_chunk_ids: null,
    metadata: {},
    created_at: new Date().toISOString(),
    pendingCitations: res.citations,
  }
  setMessages(prev => [...prev, assistantMessage])
}

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  await sendMessage(input)
}

/** テンプレートチップ選択: 利用回数を記録（fire-and-forget）して即送信 */
function handleTemplateSelect(template: QuestionTemplate) {
  void recordTemplateUsage(template.id)
  void sendMessage(template.question_text)
}
```

(c) 空状態 JSX（`{isEmpty && !loading && (` ブロック内）の注意書き `<div className="mt-2 rounded-lg bg-amber-50 ...">...</div>` の**直前**にチップを挿入:

```tsx
<QuestionTemplateChips
  templates={templates}
  mode={mode}
  disabled={loading}
  onSelect={handleTemplateSelect}
/>
```

- [ ] **Step 3: HrAssistantClient.tsx で templates を中継**

Props 型・分割代入に `templates: QuestionTemplate[]` を追加し、`<ChatPanel ... templates={templates} />` を渡す。import に `QuestionTemplate` を追加:

```tsx
import type {
  HrAssistantSession,
  HrAssistantMessage,
  AssistantMode,
  QuestionTemplate,
} from '../types'

type Props = {
  initialSessions: HrAssistantSession[]
  initialSessionId: string | null
  initialMessages: HrAssistantMessage[]
  templates: QuestionTemplate[]
}
```

- [ ] **Step 4: page.tsx で取得して渡す**

`src/app/(tenant)/(tenant-admin)/adm/(ai_agent)/hr-assistant/page.tsx` の `Promise.all` に追加:

```tsx
import {
  listHrAssistantSessions,
  listHrAssistantMessages,
  listQuestionTemplates,
} from '@/features/hr-assistant/queries'
```

```tsx
const [sessions, messages, templates] = await Promise.all([
  listHrAssistantSessions(),
  sessionId ? listHrAssistantMessages(sessionId) : Promise.resolve([]),
  listQuestionTemplates(),
])

return (
  <HrAssistantClient
    initialSessions={sessions}
    initialSessionId={sessionId}
    initialMessages={messages}
    templates={templates}
  />
)
```

- [ ] **Step 5: 検証**

Run: `npm run type-check && npm test`
Expected: 型エラーなし・全テスト PASS

Run: `npm run dev` → ブラウザで `/adm/hr-assistant` を開く（テナント管理者でログイン）
Expected:

1. 空状態に「💡 こんな質問はありませんか？」+ チップ最大 6 件（general の 8 件から 6 件）が表示される
2. モードを「労務計算」に切り替えるとチップが labor_calc の 6 件に変わる
3. チップをクリックすると質問が即送信され、回答が返る
4. `psql ... -c "SELECT question_text, usage_count FROM tenant_hr_assistant_templates WHERE usage_count > 0;"` でクリックしたテンプレの usage_count が 1 になっている

- [ ] **Step 6: コミット**

```bash
git add src/features/hr-assistant/components/QuestionTemplateChips.tsx src/features/hr-assistant/components/ChatPanel.tsx src/features/hr-assistant/components/HrAssistantClient.tsx "src/app/(tenant)/(tenant-admin)/adm/(ai_agent)/hr-assistant/page.tsx"
git commit -m "feat: AI人事アシスタントに質問テンプレートチップを追加（クリックで即送信・利用回数記録）"
```

---

## 補足

- Phase 2（法令ナレッジ自動更新）・Phase 3（テンプレートマイニング・ダッシュボードカード）は本計画の完了後、それぞれ別の実装計画を作成する（PRD 4 章参照）
- `components/index.ts` は `HrAssistantClient` のみ export しているため変更不要（要確認: QuestionTemplateChips は ChatPanel からの相対 import のみ）
