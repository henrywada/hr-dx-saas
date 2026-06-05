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
