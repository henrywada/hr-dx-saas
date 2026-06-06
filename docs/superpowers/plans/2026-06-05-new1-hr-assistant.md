# NEW-1 AIチャット型人事相談アシスタント 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** テナント管理者（人事担当）専用の AI チャットアシスタントを実装する。社内規程 RAG 参照・多ターン会話・労務計算・評価コメント添削・類似ケース検索の 4 つのモードを持つ。

**Architecture:** 既存の `inquiry-chat` feature（RAG 基盤: `tenant_rag_documents` / `tenant_rag_chunks` / `match_tenant_rag_chunks`）を再利用しつつ、HR 管理者専用の独立したセッション/メッセージテーブルを追加する。ページは `(ai_agent)` ルートグループ内に配置し、2 カラムレイアウト（左：セッション履歴、右：チャット）で実装する。OpenAI の multi-turn 会話（messages 配列）を活用し、モード別システムプロンプトで回答品質を制御する。

**Tech Stack:** Next.js 16 App Router, TypeScript 5 (strict: false), Supabase PostgreSQL + RLS + pgvector, OpenAI `gpt-4o-mini` / `text-embedding-3-small`, Tailwind CSS v4, Zod v4

---

## ファイル構成

### 新規作成

| ファイルパス | 責務 |
|---|---|
| `supabase/migrations/20260605120000_tenant_hr_assistant.sql` | hr_assistant セッション・メッセージテーブル + RLS |
| `src/features/hr-assistant/types.ts` | ドメイン型定義 |
| `src/features/hr-assistant/prompts.ts` | モード別システムプロンプト |
| `src/features/hr-assistant/queries.ts` | セッション一覧・メッセージ一覧 SELECT |
| `src/features/hr-assistant/actions.ts` | Server Actions（メッセージ送信・セッション作成・削除） |
| `src/features/hr-assistant/components/HrAssistantClient.tsx` | クライアントルートコンポーネント（2 カラムレイアウト） |
| `src/features/hr-assistant/components/SessionHistory.tsx` | 左パネル：セッション一覧 |
| `src/features/hr-assistant/components/ChatPanel.tsx` | 右パネル：チャット UI（メッセージ一覧 + 入力） |
| `src/features/hr-assistant/components/ModeSelector.tsx` | モード切替タブ（General / 労務計算 / コメント添削 / 類似ケース） |
| `src/features/hr-assistant/components/MessageBubble.tsx` | 個別メッセージ表示 + 引用元表示 |
| `src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/page.tsx` | Server Component ページエントリ |
| `src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/loading.tsx` | ローディング |
| `src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/error.tsx` | エラー |

### 修正対象

| ファイルパス | 修正内容 |
|---|---|
| `src/config/routes.ts` | `ADMIN_HR_ASSISTANT` ルート定数を追加 |

---

## Task 1: DB マイグレーション

**Files:**
- Create: `supabase/migrations/20260605120000_tenant_hr_assistant.sql`

- [ ] **Step 1: マイグレーションファイルを作成する**

```sql
-- =============================================================================
-- テナント管理者向け AI 人事相談アシスタント（NEW-1）
-- inquiry-chat の RAG 基盤（tenant_rag_documents / tenant_rag_chunks）を共用。
-- 管理者専用セッション/メッセージを分離して管理する。
-- =============================================================================

CREATE TABLE public.tenant_hr_assistant_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  title       text,
  mode        text NOT NULL DEFAULT 'general'
              CHECK (mode IN ('general', 'labor_calc', 'comment_review', 'case_search')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_hr_assistant_sessions_tenant_user_idx
  ON public.tenant_hr_assistant_sessions(tenant_id, user_id);

CREATE TABLE public.tenant_hr_assistant_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_id       uuid NOT NULL
                   REFERENCES public.tenant_hr_assistant_sessions(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL,
  role             text NOT NULL CHECK (role IN ('user', 'assistant')),
  content          text NOT NULL,
  mode             text NOT NULL DEFAULT 'general',
  cited_chunk_ids  uuid[] DEFAULT NULL,
  metadata         jsonb DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tenant_hr_assistant_messages_session_idx
  ON public.tenant_hr_assistant_messages(session_id);

-- RLS 有効化
ALTER TABLE public.tenant_hr_assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_hr_assistant_messages ENABLE ROW LEVEL SECURITY;

-- セッション RLS：同一テナントの管理者のみ参照・作成、自分のセッションのみ変更・削除
CREATE POLICY "hr_assistant_sessions_select" ON public.tenant_hr_assistant_sessions
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "hr_assistant_sessions_insert" ON public.tenant_hr_assistant_sessions
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "hr_assistant_sessions_update" ON public.tenant_hr_assistant_sessions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "hr_assistant_sessions_delete" ON public.tenant_hr_assistant_sessions
  FOR DELETE USING (user_id = auth.uid());

-- メッセージ RLS
CREATE POLICY "hr_assistant_messages_select" ON public.tenant_hr_assistant_messages
  FOR SELECT USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "hr_assistant_messages_insert" ON public.tenant_hr_assistant_messages
  FOR INSERT WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );
```

- [ ] **Step 2: マイグレーションをローカルに適用する**

```bash
supabase migration up
```

期待: エラーなし。`tenant_hr_assistant_sessions` と `tenant_hr_assistant_messages` テーブルが存在する。

- [ ] **Step 3: TypeScript 型を再生成する**

```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

期待: `tenant_hr_assistant_sessions` と `tenant_hr_assistant_messages` が `Database['public']['Tables']` に追加される。

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/20260605120000_tenant_hr_assistant.sql src/lib/supabase/types.ts
git commit -m "chore: add hr_assistant sessions/messages tables with RLS"
```

---

## Task 2: ルート定数 + ドメイン型

**Files:**
- Modify: `src/config/routes.ts`
- Create: `src/features/hr-assistant/types.ts`

- [ ] **Step 1: routes.ts に定数を追加する**

`src/config/routes.ts` の `TENANT` オブジェクト内、`ADMIN_EXIT_INTERVIEW` の直後に追加:

```typescript
    /** AI 人事相談アシスタント（NEW-1） */
    ADMIN_HR_ASSISTANT: '/adm/hr-assistant',
```

- [ ] **Step 2: 型ファイルを作成する**

```typescript
// src/features/hr-assistant/types.ts

export type AssistantMode =
  | 'general'         // 汎用 HR 相談
  | 'labor_calc'      // 労務計算（残業代・有休）
  | 'comment_review'  // 評価コメント添削
  | 'case_search'     // 過去類似ケース検索

export const ASSISTANT_MODE_LABELS: Record<AssistantMode, string> = {
  general:        '汎用相談',
  labor_calc:     '労務計算',
  comment_review: 'コメント添削',
  case_search:    '類似ケース検索',
}

export const ASSISTANT_MODE_DESCRIPTIONS: Record<AssistantMode, string> = {
  general:        '人事・労務・就業規則に関する質問に回答します',
  labor_calc:     '残業代・有休消化日数などの計算を支援します',
  comment_review: '評価コメントの添削・改善提案を行います',
  case_search:    '過去の類似相談ケースを検索します',
}

export type HrAssistantSession = {
  id: string
  title: string | null
  mode: AssistantMode
  created_at: string
  updated_at: string
}

export type HrAssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode: AssistantMode
  cited_chunk_ids: string[] | null
  metadata: Record<string, unknown>
  created_at: string
}

export type SendMessageResult =
  | {
      ok: true
      sessionId: string
      answer: string
      citations: Citation[]
    }
  | { ok: false; error: string }

export type Citation = {
  title: string
  snippet: string
}
```

- [ ] **Step 3: コミット**

```bash
git add src/config/routes.ts src/features/hr-assistant/types.ts
git commit -m "feat: add HR assistant route constant and domain types"
```

---

## Task 3: モード別システムプロンプト

**Files:**
- Create: `src/features/hr-assistant/prompts.ts`

- [ ] **Step 1: プロンプトファイルを作成する**

```typescript
// src/features/hr-assistant/prompts.ts

import type { AssistantMode } from './types'

export function buildSystemPrompt(mode: AssistantMode, hasRagContext: boolean): string {
  const base = hasRagContext
    ? '以下の「参照資料」に基づいて回答してください。参照資料にない情報は推測せず「登録された資料には記載がありません」と述べてください。'
    : '参照資料は登録されていません。一般的な日本の労働法令・人事慣行に基づいて回答してください。'

  const disclaimer =
    '重要: 最終的な判断は必ず人事責任者・社会保険労務士にご確認ください。'

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

- [ ] **Step 2: コミット**

```bash
git add src/features/hr-assistant/prompts.ts
git commit -m "feat: add hr-assistant mode-specific system prompts"
```

---

## Task 4: queries.ts（SELECT）

**Files:**
- Create: `src/features/hr-assistant/queries.ts`

- [ ] **Step 1: queries ファイルを作成する**

```typescript
// src/features/hr-assistant/queries.ts

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { HrAssistantSession, HrAssistantMessage } from './types'

/** テナント管理者のセッション一覧（新しい順 20 件） */
export async function listHrAssistantSessions(): Promise<HrAssistantSession[]> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_hr_assistant_sessions')
    .select('id, title, mode, created_at, updated_at')
    .eq('tenant_id', user.tenant_id)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[hr-assistant] listSessions', error)
    return []
  }
  return (data ?? []) as HrAssistantSession[]
}

/** セッションのメッセージ一覧（昇順） */
export async function listHrAssistantMessages(sessionId: string): Promise<HrAssistantMessage[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_hr_assistant_messages')
    .select('id, role, content, mode, cited_chunk_ids, metadata, created_at')
    .eq('session_id', sessionId)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[hr-assistant] listMessages', error)
    return []
  }
  return (data ?? []) as HrAssistantMessage[]
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/hr-assistant/queries.ts
git commit -m "feat: add hr-assistant queries (session list, message list)"
```

---

## Task 5: actions.ts（Server Actions）

**Files:**
- Create: `src/features/hr-assistant/actions.ts`

- [ ] **Step 1: actions ファイルを作成する**

```typescript
// src/features/hr-assistant/actions.ts
'use server'

import OpenAI from 'openai'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { embedQueryText, formatVectorForPg } from '../inquiry-chat/embedding'
import { RAG_TOP_K, CHAT_MODEL } from '../inquiry-chat/constants'
import { buildSystemPrompt } from './prompts'
import type { AssistantMode, SendMessageResult, Citation } from './types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/** 最大コンテキスト履歴ターン数（古いものは除外してトークンを節約） */
const MAX_HISTORY_TURNS = 6

export async function sendHrAssistantMessage(input: {
  sessionId?: string | null
  message: string
  mode: AssistantMode
}): Promise<SendMessageResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }
  if (!input.message?.trim()) return { ok: false, error: 'メッセージを入力してください' }
  if (!process.env.OPENAI_API_KEY) return { ok: false, error: 'OPENAI_API_KEY が未設定です' }

  const message = input.message.trim()
  const mode = input.mode

  const supabase = await createClient()

  // セッション取得または新規作成
  let sessionId = input.sessionId || null
  if (!sessionId) {
    const { data: sess, error: sErr } = await supabase
      .from('tenant_hr_assistant_sessions')
      .insert({
        tenant_id: user.tenant_id,
        user_id: user.id,
        title: message.slice(0, 80),
        mode,
      })
      .select('id')
      .single()

    if (sErr || !sess) {
      console.error('[hr-assistant] create session', sErr)
      return { ok: false, error: 'セッションの開始に失敗しました' }
    }
    sessionId = sess.id as string
  }

  // ユーザーメッセージを保存
  const { error: uErr } = await supabase.from('tenant_hr_assistant_messages').insert({
    tenant_id: user.tenant_id,
    session_id: sessionId,
    user_id: user.id,
    role: 'user',
    content: message,
    mode,
  })
  if (uErr) {
    console.error('[hr-assistant] insert user msg', uErr)
    return { ok: false, error: 'メッセージの保存に失敗しました' }
  }

  // RAG 検索（全モードで参照資料を活用）
  let citations: Citation[] = []
  let citedIds: string[] = []
  let contextBlocks: string[] = []

  try {
    const queryEmbedding = await embedQueryText(message)
    const { data: hits, error: rpcErr } = await supabase.rpc('match_tenant_rag_chunks', {
      query_embedding: formatVectorForPg(queryEmbedding),
      match_count: RAG_TOP_K,
    })

    if (!rpcErr && hits) {
      const rows = (hits ?? []) as {
        id: string
        content: string
        metadata: { document_title?: string }
      }[]

      contextBlocks = rows.map((r, i) => {
        const title = r.metadata?.document_title || '文書'
        return `【資料${i + 1}: ${title}】\n${r.content}`
      })

      citations = rows.slice(0, 5).map((r) => ({
        title: (r.metadata?.document_title as string) || '文書',
        snippet: r.content.slice(0, 200) + (r.content.length > 200 ? '…' : ''),
      }))
      citedIds = rows.map((r) => r.id)
    }
  } catch (e) {
    console.error('[hr-assistant] embedding/rag', e)
    // RAG 失敗は致命的でない。contextBlocks が空のまま続行。
  }

  // 会話履歴の取得（multi-turn 対応）
  const { data: historyRows } = await supabase
    .from('tenant_hr_assistant_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_TURNS * 2)

  const recentHistory = ((historyRows ?? []) as { role: string; content: string }[]).reverse()

  // OpenAI へ送信するメッセージ配列を構築
  const systemPrompt = buildSystemPrompt(mode, contextBlocks.length > 0)

  const openaiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (contextBlocks.length > 0) {
    openaiMessages.push({
      role: 'user',
      content: `参照資料:\n${contextBlocks.join('\n\n---\n\n')}\n\n以上を踏まえて会話を続けてください。`,
    })
    openaiMessages.push({
      role: 'assistant',
      content: '参照資料を確認しました。ご質問をどうぞ。',
    })
  }

  // 直近の会話履歴（現在の user メッセージ 1 件は除く）
  const history = recentHistory.slice(0, -1)
  for (const h of history) {
    if (h.role === 'user' || h.role === 'assistant') {
      openaiMessages.push({ role: h.role, content: h.content })
    }
  }

  openaiMessages.push({ role: 'user', content: message })

  let answer: string
  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: openaiMessages,
      temperature: 0.3,
      max_tokens: 2000,
    })
    answer = completion.choices[0]?.message?.content?.trim() || ''
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI 応答に失敗しました'
    return { ok: false, error: msg }
  }

  if (!answer) return { ok: false, error: 'AI からの応答が空でした' }

  // アシスタント回答を保存
  const { error: aErr } = await supabase.from('tenant_hr_assistant_messages').insert({
    tenant_id: user.tenant_id,
    session_id: sessionId,
    user_id: user.id,
    role: 'assistant',
    content: answer,
    mode,
    cited_chunk_ids: citedIds.length ? citedIds : null,
    metadata: { citation_count: citations.length },
  })
  if (aErr) {
    console.error('[hr-assistant] insert assistant msg', aErr)
    return { ok: false, error: '回答の保存に失敗しました' }
  }

  // セッション更新日時を更新
  await supabase
    .from('tenant_hr_assistant_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  revalidatePath(APP_ROUTES.TENANT.ADMIN_HR_ASSISTANT)
  return { ok: true, sessionId, answer, citations }
}

export async function deleteHrAssistantSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenant_hr_assistant_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[hr-assistant] delete session', error)
    return { ok: false, error: '削除に失敗しました' }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_HR_ASSISTANT)
  return { ok: true }
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/hr-assistant/actions.ts
git commit -m "feat: add hr-assistant server actions (send message, delete session)"
```

---

## Task 6: UI コンポーネント — MessageBubble

**Files:**
- Create: `src/features/hr-assistant/components/MessageBubble.tsx`

- [ ] **Step 1: MessageBubble を作成する**

```tsx
// src/features/hr-assistant/components/MessageBubble.tsx
'use client'

import { cn } from '@/lib/utils'
import type { HrAssistantMessage, Citation } from '../types'

type Props = {
  message: HrAssistantMessage
  citations?: Citation[]
}

export function MessageBubble({ message, citations }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}
      <div className={cn('max-w-[80%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm',
          )}
        >
          {message.content}
        </div>
        {!isUser && citations && citations.length > 0 && (
          <div className="ml-1">
            <p className="text-xs font-semibold text-slate-500 mb-1">参照資料</p>
            <ul className="space-y-1">
              {citations.map((c, i) => (
                <li key={i} className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">{c.title}</span>
                  <p className="text-slate-500 line-clamp-1 mt-0.5">{c.snippet}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className={cn('text-xs text-slate-400 px-1', isUser ? 'text-right' : 'text-left')}>
          {new Date(message.created_at).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
          <span className="text-slate-600 text-xs font-bold">HR</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/hr-assistant/components/MessageBubble.tsx
git commit -m "feat: add MessageBubble component for hr-assistant chat"
```

---

## Task 7: UI コンポーネント — ModeSelector

**Files:**
- Create: `src/features/hr-assistant/components/ModeSelector.tsx`

- [ ] **Step 1: ModeSelector を作成する**

```tsx
// src/features/hr-assistant/components/ModeSelector.tsx
'use client'

import { cn } from '@/lib/utils'
import type { AssistantMode } from '../types'
import { ASSISTANT_MODE_LABELS, ASSISTANT_MODE_DESCRIPTIONS } from '../types'

const MODES: AssistantMode[] = ['general', 'labor_calc', 'comment_review', 'case_search']

const MODE_ICONS: Record<AssistantMode, string> = {
  general:        '💬',
  labor_calc:     '🧮',
  comment_review: '✏️',
  case_search:    '🔍',
}

type Props = {
  value: AssistantMode
  onChange: (mode: AssistantMode) => void
  disabled?: boolean
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          disabled={disabled}
          onClick={() => onChange(mode)}
          title={ASSISTANT_MODE_DESCRIPTIONS[mode]}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            value === mode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span>{MODE_ICONS[mode]}</span>
          {ASSISTANT_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/hr-assistant/components/ModeSelector.tsx
git commit -m "feat: add ModeSelector component for hr-assistant"
```

---

## Task 8: UI コンポーネント — SessionHistory

**Files:**
- Create: `src/features/hr-assistant/components/SessionHistory.tsx`

- [ ] **Step 1: SessionHistory を作成する**

```tsx
// src/features/hr-assistant/components/SessionHistory.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { deleteHrAssistantSession } from '../actions'
import type { HrAssistantSession, AssistantMode } from '../types'
import { ASSISTANT_MODE_LABELS } from '../types'

const MODE_BADGE_COLORS: Record<AssistantMode, string> = {
  general:        'bg-slate-100 text-slate-600',
  labor_calc:     'bg-amber-100 text-amber-700',
  comment_review: 'bg-violet-100 text-violet-700',
  case_search:    'bg-teal-100 text-teal-700',
}

type Props = {
  sessions: HrAssistantSession[]
  activeSessionId: string | null
  onSelectSession: (session: HrAssistantSession) => void
  onNewSession: () => void
}

export function SessionHistory({ sessions, activeSessionId, onSelectSession, onNewSession }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation()
    if (!confirm('このセッションを削除しますか？')) return
    setDeleting(sessionId)
    await deleteHrAssistantSession(sessionId)
    setDeleting(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <button
          type="button"
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <span className="text-base leading-none">＋</span>
          新規相談を開始
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">
            まだ相談履歴がありません
          </p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session)}
            className={cn(
              'group relative p-3 rounded-lg cursor-pointer transition-colors',
              activeSessionId === session.id
                ? 'bg-blue-50 border border-blue-200'
                : 'hover:bg-slate-50 border border-transparent',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {session.title || '（タイトルなし）'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      MODE_BADGE_COLORS[session.mode as AssistantMode] ?? 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {ASSISTANT_MODE_LABELS[session.mode as AssistantMode] ?? session.mode}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(session.updated_at).toLocaleDateString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => handleDelete(e, session.id)}
                disabled={deleting === session.id}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity shrink-0"
                aria-label="削除"
              >
                {deleting === session.id ? '…' : '✕'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/hr-assistant/components/SessionHistory.tsx
git commit -m "feat: add SessionHistory sidebar component for hr-assistant"
```

---

## Task 9: UI コンポーネント — ChatPanel

**Files:**
- Create: `src/features/hr-assistant/components/ChatPanel.tsx`

- [ ] **Step 1: ChatPanel を作成する**

```tsx
// src/features/hr-assistant/components/ChatPanel.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ModeSelector } from './ModeSelector'
import { MessageBubble } from './MessageBubble'
import { sendHrAssistantMessage } from '../actions'
import type { AssistantMode, HrAssistantMessage, Citation } from '../types'
import { ASSISTANT_MODE_DESCRIPTIONS } from '../types'

type LocalMessage = HrAssistantMessage & { pendingCitations?: Citation[] }

type Props = {
  sessionId: string | null
  initialMessages: HrAssistantMessage[]
  initialMode: AssistantMode
  onSessionCreated: (sessionId: string, mode: AssistantMode, title: string) => void
}

export function ChatPanel({ sessionId, initialMessages, initialMode, onSessionCreated }: Props) {
  const [mode, setMode] = useState<AssistantMode>(initialMode)
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useRef<string | null>(sessionId)

  useEffect(() => {
    setMessages(initialMessages)
    currentSessionId.current = sessionId
    setMode(initialMode)
    setError(null)
  }, [sessionId, initialMessages, initialMode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
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
    setMessages((prev) => [...prev, optimisticUser])

    const res = await sendHrAssistantMessage({
      sessionId: currentSessionId.current,
      message: userMessage,
      mode,
    })

    setLoading(false)

    if (res.ok === false) {
      setError(res.error)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id))
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
    setMessages((prev) => [...prev, assistantMessage])
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <ModeSelector value={mode} onChange={setMode} disabled={loading} />
        <p className="text-xs text-slate-500 mt-1.5">{ASSISTANT_MODE_DESCRIPTIONS[mode]}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEmpty && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-base font-semibold text-slate-700">AI 人事相談アシスタント</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              上のモードを選択して質問を入力してください。
              社内規程・労務計算・評価コメントなど、人事業務をサポートします。
            </p>
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 max-w-sm text-left">
              <p className="font-semibold mb-1">ご利用にあたって</p>
              <p>
                回答は登録されたナレッジ文書に基づきます。最終的な判断は必ず人事責任者・社会保険労務士にご確認ください。
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            citations={msg.pendingCitations}
          />
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-4 bg-white">
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="質問を入力…（Ctrl+Enter で送信）"
            rows={3}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !input.trim()}
            className="shrink-0 h-[72px] px-5"
          >
            送信
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/hr-assistant/components/ChatPanel.tsx
git commit -m "feat: add ChatPanel component with multi-turn support and optimistic UI"
```

---

## Task 10: UI コンポーネント — HrAssistantClient（メインクライアント）

**Files:**
- Create: `src/features/hr-assistant/components/HrAssistantClient.tsx`

- [ ] **Step 1: HrAssistantClient を作成する**

```tsx
// src/features/hr-assistant/components/HrAssistantClient.tsx
'use client'

import { useState } from 'react'
import { SessionHistory } from './SessionHistory'
import { ChatPanel } from './ChatPanel'
import type { HrAssistantSession, HrAssistantMessage, AssistantMode } from '../types'

type Props = {
  initialSessions: HrAssistantSession[]
  initialSessionId: string | null
  initialMessages: HrAssistantMessage[]
}

export function HrAssistantClient({ initialSessions, initialSessionId, initialMessages }: Props) {
  const [sessions, setSessions] = useState<HrAssistantSession[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId)
  const [activeMessages, setActiveMessages] = useState<HrAssistantMessage[]>(initialMessages)
  const [activeMode, setActiveMode] = useState<AssistantMode>('general')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  function handleSelectSession(session: HrAssistantSession) {
    // URL パラメータ変更で Server Component を再レンダリングしてメッセージを取得
    const url = new URL(window.location.href)
    url.searchParams.set('session', session.id)
    window.location.href = url.toString()
  }

  function handleNewSession() {
    setActiveSessionId(null)
    setActiveMessages([])
    setActiveMode('general')
    const url = new URL(window.location.href)
    url.searchParams.delete('session')
    window.history.pushState({}, '', url.toString())
  }

  function handleSessionCreated(sessionId: string, mode: AssistantMode, title: string) {
    const newSession: HrAssistantSession = {
      id: sessionId,
      title,
      mode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(sessionId)

    const url = new URL(window.location.href)
    url.searchParams.set('session', sessionId)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* 左パネル：セッション履歴 */}
      <div
        className={`${
          isSidebarOpen ? 'w-72' : 'w-0'
        } shrink-0 border-r border-slate-200 bg-white overflow-hidden transition-all duration-200`}
      >
        <SessionHistory
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
        />
      </div>

      {/* 右パネル：チャット */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 text-sm"
            aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <span className="text-sm font-semibold text-slate-700">AI 人事相談アシスタント</span>
        </div>
        <ChatPanel
          sessionId={activeSessionId}
          initialMessages={activeMessages}
          initialMode={activeMode}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/features/hr-assistant/components/HrAssistantClient.tsx
git commit -m "feat: add HrAssistantClient layout with session and chat panels"
```

---

## Task 11: ページ・ローディング・エラー

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/error.tsx`

- [ ] **Step 1: page.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/page.tsx

import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { listHrAssistantSessions, listHrAssistantMessages } from '@/features/hr-assistant/queries'
import { HrAssistantClient } from '@/features/hr-assistant/components/HrAssistantClient'

export const maxDuration = 60

export default async function HrAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const resolvedParams = await searchParams
  const sessionIdParam = resolvedParams.session as string | undefined

  const [sessions, initialMessages] = await Promise.all([
    listHrAssistantSessions(),
    sessionIdParam ? listHrAssistantMessages(sessionIdParam) : Promise.resolve([]),
  ])

  const activeSession = sessionIdParam
    ? sessions.find((s) => s.id === sessionIdParam) ?? null
    : null

  return (
    <HrAssistantClient
      initialSessions={sessions}
      initialSessionId={activeSession?.id ?? null}
      initialMessages={initialMessages}
    />
  )
}
```

- [ ] **Step 2: loading.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/loading.tsx

export default function HrAssistantLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden animate-pulse">
      <div className="w-72 shrink-0 border-r border-slate-200 bg-white p-4 space-y-3">
        <div className="h-10 bg-slate-200 rounded-lg" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-lg" />
        ))}
      </div>
      <div className="flex-1 bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">読み込み中…</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: error.tsx を作成する**

```tsx
// src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/error.tsx
'use client'

import { Button } from '@/components/ui/Button'

export default function HrAssistantError({
  reset,
}: {
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <div className="text-center space-y-4 max-w-sm px-4">
        <p className="text-lg font-semibold text-slate-700">エラーが発生しました</p>
        <p className="text-sm text-slate-500">ページの読み込みに失敗しました。再試行してください。</p>
        <Button variant="outline" onClick={reset}>
          再試行
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: コミット**

```bash
git add "src/app/(tenant)/(colored)/adm/(ai_agent)/hr-assistant/"
git commit -m "feat: add hr-assistant page, loading, and error components"
```

---

## Task 12: 動作確認

- [ ] **Step 1: 開発サーバーを起動する**

```bash
npm run dev
```

- [ ] **Step 2: 管理者でログインして `/adm/hr-assistant` へアクセス**

期待: 2 カラムレイアウトが表示される。左：「新規相談を開始」ボタン + セッション履歴（初回は空）。右：AI アシスタントの案内メッセージ。

- [ ] **Step 3: モード選択を確認**

「労務計算」タブを選択 → プレースホルダーテキストとモード説明が変わることを確認。

- [ ] **Step 4: メッセージを送信**

入力欄に「有給休暇を 5 日取得しました。残日数の計算方法を教えてください。」と入力して送信。

期待: ユーザーメッセージがバブルで表示される → ローディングアニメーション → AI 回答が表示される。

- [ ] **Step 5: セッション履歴への保存を確認**

送信後、左パネルにセッションが追加されることを確認。

- [ ] **Step 6: 過去セッションの再開を確認**

左パネルのセッションをクリック → URL に `?session=<id>` が付与され、過去メッセージが表示されることを確認。

- [ ] **Step 7: セッション削除を確認**

セッション項目をホバー → 「✕」ボタンをクリック → 確認ダイアログ → 削除されることを確認。

- [ ] **Step 8: 型チェック**

```bash
npm run type-check
```

期待: エラーなし（または既存のエラーのみ）。

- [ ] **Step 9: 最終コミット**

```bash
git add .
git commit -m "feat: complete NEW-1 AI hr-assistant feature"
```

---

## Self-Review

### Spec 対応チェック

| 要件 | 対応タスク |
|---|---|
| 社内規程・就業規則をRAGで参照するチャットUI | Task 5（actions.ts の RAG 検索 + match_tenant_rag_chunks 再利用） |
| 労務計算（残業代・有休消化日数）の自動回答 | Task 3（prompts.ts の labor_calc モード）+ Task 7（ModeSelector） |
| 評価コメントの添削・改善提案（AI） | Task 3（prompts.ts の comment_review モード）|
| 過去の類似ケース検索 | Task 3（prompts.ts の case_search モード）|
| チャット UI（多ターン会話） | Task 9（ChatPanel の messages 配列 + Optimistic UI） |
| セッション履歴 | Task 8（SessionHistory）+ Task 4（queries.ts） |
| 管理者専用（adm/ 配下） | Task 11（page.tsx が (ai_agent) ルートグループ内） |
| 既存データ保護 | 新規テーブルのみ追加。DROP/ALTER 既存テーブルなし |

### プレースホルダースキャン

- 全ステップにコードブロックあり
- 「TBD」「TODO」なし

### 型整合性

- `AssistantMode` は `types.ts` で定義し、`prompts.ts` / `actions.ts` / 全 UI コンポーネントが参照
- `Citation` 型は `types.ts` で定義し、`actions.ts` と `MessageBubble.tsx` が共用
- `HrAssistantSession` / `HrAssistantMessage` は `queries.ts` の戻り値型と UI コンポーネントの Props 型が一致

---

> **注意事項:**
> - `supabase db reset` は絶対に実行しない
> - 既存の `inquiry-chat` 機能（テーブル・actions・components）は一切変更しない
> - `createAdminClient()` はエンドユーザー向け actions.ts 内では使用しない
> - クラウド Supabase への操作は事前に確認を取る
