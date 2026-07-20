'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { RAG_TOP_K } from '../inquiry-chat/constants'
import { buildSystemPrompt } from './prompts'
import type { AssistantMode, SendMessageResult, Citation } from './types'
import { openRouterChat, OPENROUTER_CHAT_MODEL } from '@/lib/ai/openrouter'
// 埋め込みは Gemini に統一（社内資料RAGと同じベクトル空間・同じ 1536 次元）。
// OpenAI text-embedding-3-small は日本語の法令文書で類似度が 0.24〜0.40 に圧縮され、
// 関連チャンクより無関係チャンクが上位に来る状態だったため移行した。
import { embedQueryText, formatVectorForPg } from '../inquiry-chat/embedding'
import { formatLawContextBlocks, formatLawCitations } from './law-context'
import type { LawChunkRow } from './law-context'
import { fetchAndStoreLawOnMiss } from './ondemand-law'
import { fetchLawArticleContext } from './egov-law'

/** 最大コンテキスト履歴ターン数（古いものは除外してトークンを節約） */
const MAX_HISTORY_TURNS = 6

/** 法令 RAG の類似度がこの値未満ならオンデマンド収集を検討 */
const LAW_MISS_SIMILARITY_THRESHOLD = 0.55

/**
 * 法令チャンクの取得件数。
 * 日本語の質問は資料側と語彙が揺れやすく（例: 質問「14連勤」/ 資料「連続勤務」）、
 * 上位数件では本命チャンクを取りこぼす。実測でも該当チャンクが11位・56位だったため
 * 広めに取り、取捨選択は LLM 側に委ねる。
 */
const LAW_RAG_MATCH_COUNT = 12

export async function sendHrAssistantMessage(input: {
  sessionId?: string | null
  message: string
  mode: AssistantMode
}): Promise<SendMessageResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }
  if (!input.message?.trim()) return { ok: false, error: 'メッセージを入力してください' }
  // 回答生成は OpenRouter、埋め込み（RAG検索）は Gemini を使う
  if (!process.env.OPENROUTER_API_KEY)
    return { ok: false, error: 'OPENROUTER_API_KEY が未設定です' }
  if (!process.env.GEMINI_API_KEY) return { ok: false, error: 'GEMINI_API_KEY が未設定です' }

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

  // RAG 検索（社内資料 + 法令ナレッジの2系統を並列実行、全モードで活用）
  let citations: Citation[] = []
  let citedIds: string[] = []
  let contextBlocks: string[] = []
  let hasLawContext = false
  let bestLawSimilarity = 0

  // 「労基法第32条」等、条文が明示された質問は e-Gov 原文取得を試行する
  // （RAG検索と並行実行してレイテンシを吸収する）
  const egovLawPromise = fetchLawArticleContext(message).catch(e => {
    console.error('[hr-assistant] egov law', e)
    return null
  })

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
        match_count: LAW_RAG_MATCH_COUNT,
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
        bestLawSimilarity = Math.max(...lawRows.map(r => r.similarity ?? 0))
        hasLawContext = true
        contextBlocks = [...contextBlocks, ...formatLawContextBlocks(lawRows)]
        citations = [...citations, ...formatLawCitations(lawRows)]
        citedIds = [...citedIds, ...lawRows.map(r => r.id)]
      }
    } else if (lawResult.error) {
      console.error('[hr-assistant] rag law', lawResult.error)
    }

    // 法令ヒットが弱い場合はオンデマンドで厚労省系を探索し KB に追加
    if (bestLawSimilarity < LAW_MISS_SIMILARITY_THRESHOLD) {
      try {
        const onDemand = await fetchAndStoreLawOnMiss(message)
        if (onDemand) {
          hasLawContext = true
          contextBlocks = [...contextBlocks, ...onDemand.contextBlocks]
          citations = [...citations, ...onDemand.citations]
          citedIds = [...citedIds, ...onDemand.citedIds]
        }
      } catch (e) {
        console.error('[hr-assistant] ondemand law', e)
      }
    }
  } catch (e) {
    console.error('[hr-assistant] embedding/rag', e)
    // RAG 失敗は致命的でない。contextBlocks が空のまま続行。
  }

  const egovLawResult = await egovLawPromise
  if (egovLawResult) {
    hasLawContext = true
    contextBlocks = [...contextBlocks, ...egovLawResult.contextBlocks]
    citations = [...citations, ...egovLawResult.citations]
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

  const systemPrompt = buildSystemPrompt(mode, contextBlocks.length > 0, hasLawContext)

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (contextBlocks.length > 0) {
    messages.push({
      role: 'user',
      content: `参照資料:\n${contextBlocks.join('\n\n---\n\n')}\n\n以上を踏まえて会話を続けてください。`,
    })
    messages.push({
      role: 'assistant',
      content: '参照資料を確認しました。ご質問をどうぞ。',
    })
  }

  // 直近の会話履歴（現在の user メッセージ 1 件は除く）
  const history = recentHistory.slice(0, -1)
  for (const h of history) {
    if (h.role === 'user' || h.role === 'assistant') {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      })
    }
  }

  messages.push({ role: 'user', content: message })

  let answer: string
  try {
    const completion = await openRouterChat({
      model: OPENROUTER_CHAT_MODEL,
      messages,
      temperature: 0.3,
      maxTokens: 2000,
    })
    answer = completion.content
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

export async function deleteHrAssistantSession(
  sessionId: string
): Promise<{ ok: boolean; error?: string }> {
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
