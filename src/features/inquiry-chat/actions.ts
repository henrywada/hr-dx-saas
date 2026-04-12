'use server'

import { revalidatePath } from 'next/cache'
import OpenAI from 'openai'
import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import type { Database } from '@/lib/supabase/types'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { chunkPlainText } from './chunk'
import { embedChunks, embedQueryText, formatVectorForPg } from './embedding'
import { CHAT_MODEL, RAG_TOP_K } from './constants'

// extractors（pdfjs 等）は取り込み Server Action 内でのみ dynamic import する。
// 先頭で静的 import するとチャット送信だけでもバンドルが読み込まれ Next サーバーで落ちる。

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Supabase Storage の object key に非 ASCII を含めると `Invalid key` になるため、
 * UUID に英数字のみの拡張子を付けたパスにする（表示用は original_filename を参照）。
 */
function storageObjectFileName(originalName: string): string {
  const id = randomUUID()
  const lastDot = originalName.lastIndexOf('.')
  if (lastDot <= 0 || lastDot >= originalName.length - 1) {
    return id
  }
  let ext = originalName
    .slice(lastDot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  if (ext.length > 8) ext = ext.slice(0, 8)
  return ext ? `${id}.${ext}` : id
}

/** Storage バケットの allowed_mime_types と一致させる。空や octet-stream だとアップロードが拒否される。 */
function resolveMimeTypeForRagUpload(file: File): string {
  const raw = (file.type || '').trim().toLowerCase()
  if (raw && raw !== 'application/octet-stream') {
    return file.type
  }
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel'
  if (lower.endsWith('.csv')) return 'text/csv'
  if (lower.endsWith('.txt')) return 'text/plain'
  return file.type || 'application/octet-stream'
}

/** RLS と JWT の tenant 不一致を避けるため取り込み・削除は service_role（tenant_id は getServerUser で検証済み） */
function tryRagServiceClient(): SupabaseClient<Database> | null {
  try {
    return createAdminServiceClient()
  } catch {
    return null
  }
}

async function writeAudit(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  userId: string,
  action: string,
  documentId: string | null,
  detail: Record<string, unknown>
) {
  await supabase.from('tenant_rag_audit_logs').insert({
    tenant_id: tenantId,
    actor_user_id: userId,
    action,
    document_id: documentId,
    detail: detail as import('@/lib/supabase/types').Json,
  })
}

async function finalizeDocumentChunks(params: {
  supabase: SupabaseClient<Database>
  tenantId: string
  userId: string
  documentId: string
  title: string
  sourceKind: string
  plainText: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, tenantId, userId, documentId, title, sourceKind, plainText } = params

  const chunks = chunkPlainText(plainText)
  if (chunks.length === 0) {
    await supabase
      .from('tenant_rag_documents')
      .update({
        status: 'failed',
        error_message: '本文が空のためチャンクを作成できませんでした',
        ingest_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
    await writeAudit(supabase, tenantId, userId, 'ingest_failed', documentId, { reason: 'empty_text' })
    return { ok: false, error: '本文が空です' }
  }

  let embeddings: number[][]
  try {
    embeddings = await embedChunks(chunks)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '埋め込みに失敗しました'
    await supabase
      .from('tenant_rag_documents')
      .update({
        status: 'failed',
        error_message: msg,
        ingest_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
    await writeAudit(supabase, tenantId, userId, 'ingest_failed', documentId, { reason: 'embedding' })
    return { ok: false, error: msg }
  }

  const batchSize = 32
  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize)
    const embSlice = embeddings.slice(i, i + batchSize)
    const rows = slice.map((content, j) => ({
      tenant_id: tenantId,
      document_id: documentId,
      chunk_index: i + j,
      content,
      embedding: formatVectorForPg(embSlice[j]!),
      metadata: {
        document_title: title,
        source_kind: sourceKind,
        chunk_index: i + j,
      },
    }))
    const { error: insErr } = await supabase.from('tenant_rag_chunks').insert(rows)
    if (insErr) {
      console.error('[inquiry-chat] chunk insert', insErr)
      await supabase
        .from('tenant_rag_documents')
        .update({
          status: 'failed',
          error_message: insErr.message,
          ingest_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
      await writeAudit(supabase, tenantId, userId, 'ingest_failed', documentId, { reason: 'chunk_insert' })
      return { ok: false, error: 'チャンクの保存に失敗しました' }
    }
  }

  await supabase
    .from('tenant_rag_documents')
    .update({
      status: 'ready',
      ingest_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', documentId)

  await writeAudit(supabase, tenantId, userId, 'ingest_completed', documentId, { chunk_count: chunks.length })
  return { ok: true }
}

export async function ingestPasteAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }

  const title = (formData.get('title') as string)?.trim() || '貼り付けテキスト'
  const body = (formData.get('body') as string)?.trim() || ''
  if (!body) return { ok: false, error: '本文を入力してください' }

  const supabase = tryRagServiceClient()
  if (!supabase) {
    return {
      ok: false,
      error:
        'サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。管理者に .env の設定を確認してください。',
    }
  }
  const { data: doc, error: docErr } = await supabase
    .from('tenant_rag_documents')
    .insert({
      tenant_id: user.tenant_id,
      title,
      source_kind: 'paste',
      status: 'pending',
      created_by: user.id,
      ingest_started_at: new Date().toISOString(),
      byte_size: body.length,
    })
    .select('id')
    .single()

  if (docErr || !doc) {
    console.error('[inquiry-chat] ingestPaste doc', docErr)
    return { ok: false, error: 'ドキュメントの作成に失敗しました' }
  }

  const documentId = doc.id as string
  const fin = await finalizeDocumentChunks({
    supabase,
    tenantId: user.tenant_id,
    userId: user.id,
    documentId,
    title,
    sourceKind: 'paste',
    plainText: body,
  })

  revalidatePath(APP_ROUTES.TENANT.ADMIN_INQUIRY_KNOWLEDGE)
  if (fin.ok === false) return { ok: false, error: fin.error }
  return { ok: true }
}

export async function ingestUrlAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }

  const title = (formData.get('title') as string)?.trim() || 'Webページ'
  const url = (formData.get('url') as string)?.trim() || ''
  if (!url) return { ok: false, error: 'URL を入力してください' }

  let plainText: string
  let finalUrl: string
  try {
    const { extractTextFromUrl } = await import('./extractors/url')
    const extracted = await extractTextFromUrl(url)
    plainText = extracted.text
    finalUrl = extracted.finalUrl
  } catch (e) {
    const msg = e instanceof Error ? e.message : '取得に失敗しました'
    return { ok: false, error: msg }
  }

  if (!plainText.trim()) return { ok: false, error: 'ページから本文を抽出できませんでした' }

  const supabase = tryRagServiceClient()
  if (!supabase) {
    return {
      ok: false,
      error:
        'サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。管理者に .env の設定を確認してください。',
    }
  }
  const { data: doc, error: docErr } = await supabase
    .from('tenant_rag_documents')
    .insert({
      tenant_id: user.tenant_id,
      title,
      source_kind: 'url',
      source_url: finalUrl,
      status: 'pending',
      created_by: user.id,
      ingest_started_at: new Date().toISOString(),
      byte_size: plainText.length,
    })
    .select('id')
    .single()

  if (docErr || !doc) {
    console.error('[inquiry-chat] ingestUrl doc', docErr)
    return { ok: false, error: 'ドキュメントの作成に失敗しました' }
  }

  const documentId = doc.id as string
  const fin = await finalizeDocumentChunks({
    supabase,
    tenantId: user.tenant_id,
    userId: user.id,
    documentId,
    title,
    sourceKind: 'url',
    plainText,
  })

  revalidatePath(APP_ROUTES.TENANT.ADMIN_INQUIRY_KNOWLEDGE)
  if (fin.ok === false) return { ok: false, error: fin.error }
  return { ok: true }
}

export async function ingestFileAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { ok: false, error: 'ファイルを選択してください' }
  if (file.size > 50 * 1024 * 1024) return { ok: false, error: '50MB 以下のファイルにしてください' }

  const title =
    (formData.get('title') as string)?.trim() || file.name.replace(/\.[^.]+$/, '') || 'アップロード文書'

  const resolvedMime = resolveMimeTypeForRagUpload(file)

  const buf = Buffer.from(await file.arrayBuffer())
  let plainText: string
  try {
    const { extractTextFromUploadedFile } = await import('./extractors/files')
    plainText = await extractTextFromUploadedFile(buf, resolvedMime, file.name)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '読み取りに失敗しました'
    return { ok: false, error: msg }
  }

  const supabase = tryRagServiceClient()
  if (!supabase) {
    return {
      ok: false,
      error:
        'サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。管理者に .env の設定を確認してください。',
    }
  }

  const { data: doc, error: docErr } = await supabase
    .from('tenant_rag_documents')
    .insert({
      tenant_id: user.tenant_id,
      title,
      source_kind: 'file',
      mime_type: resolvedMime !== 'application/octet-stream' ? resolvedMime : file.type || null,
      original_filename: file.name,
      status: 'pending',
      created_by: user.id,
      ingest_started_at: new Date().toISOString(),
      byte_size: file.size,
    })
    .select('id')
    .single()

  if (docErr || !doc) {
    console.error('[inquiry-chat] ingestFile doc', docErr)
    return { ok: false, error: 'ドキュメントの作成に失敗しました' }
  }

  const documentId = doc.id as string
  const storagePath = `${user.tenant_id}/${documentId}/${storageObjectFileName(file.name)}`
  const { error: upErr } = await supabase.storage.from('tenant_rag').upload(storagePath, buf, {
    contentType: resolvedMime,
    upsert: false,
  })

  if (upErr) {
    console.error('[inquiry-chat] storage upload', upErr.message, upErr)
    await supabase.from('tenant_rag_documents').delete().eq('id', documentId)
    return { ok: false, error: 'ファイルの保存に失敗しました' }
  }

  await supabase.from('tenant_rag_documents').update({ storage_path: storagePath }).eq('id', documentId)

  const fin = await finalizeDocumentChunks({
    supabase,
    tenantId: user.tenant_id,
    userId: user.id,
    documentId,
    title,
    sourceKind: 'file',
    plainText,
  })

  revalidatePath(APP_ROUTES.TENANT.ADMIN_INQUIRY_KNOWLEDGE)
  if (fin.ok === false) return { ok: false, error: fin.error }
  return { ok: true }
}

export async function deleteRagDocumentAction(documentId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }

  const supabase = tryRagServiceClient()
  if (!supabase) {
    return {
      ok: false,
      error:
        'サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。管理者に .env の設定を確認してください。',
    }
  }
  const { data: row } = await supabase
    .from('tenant_rag_documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (!row) return { ok: false, error: '文書が見つかりません' }

  const storagePath = (row as { storage_path?: string | null }).storage_path
  if (storagePath) {
    await supabase.storage.from('tenant_rag').remove([storagePath])
  }

  const { error } = await supabase.from('tenant_rag_documents').delete().eq('id', documentId)
  if (error) {
    console.error('[inquiry-chat] delete', error)
    return { ok: false, error: '削除に失敗しました' }
  }

  await writeAudit(supabase, user.tenant_id, user.id, 'document_deleted', documentId, {})
  revalidatePath(APP_ROUTES.TENANT.ADMIN_INQUIRY_KNOWLEDGE)
  return { ok: true }
}

export type InquiryCitation = { title: string; snippet: string }

export async function sendInquiryMessage(input: {
  sessionId?: string | null
  message: string
}): Promise<
  | { ok: true; sessionId: string; answer: string; citations: InquiryCitation[] }
  | { ok: false; error: string }
> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }

  const message = input.message?.trim() || ''
  if (!message) return { ok: false, error: 'メッセージを入力してください' }
  if (!process.env.OPENAI_API_KEY) return { ok: false, error: 'OPENAI_API_KEY が未設定です' }

  const supabase = await createClient()

  let sessionId = input.sessionId || null
  if (!sessionId) {
    const { data: sess, error: sErr } = await supabase
      .from('tenant_inquiry_chat_sessions')
      .insert({
        tenant_id: user.tenant_id,
        user_id: user.id,
        title: message.slice(0, 80),
      })
      .select('id')
      .single()
    if (sErr || !sess) {
      console.error('[inquiry-chat] session', sErr)
      return { ok: false, error: 'セッションの開始に失敗しました' }
    }
    sessionId = sess.id as string
  }

  const { error: uErr } = await supabase.from('tenant_inquiry_chat_messages').insert({
    tenant_id: user.tenant_id,
    session_id: sessionId,
    user_id: user.id,
    role: 'user',
    content: message,
  })
  if (uErr) {
    console.error('[inquiry-chat] user msg', uErr)
    return { ok: false, error: 'メッセージの保存に失敗しました' }
  }

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedQueryText(message)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '埋め込みに失敗しました'
    return { ok: false, error: msg }
  }

  const { data: hits, error: rpcErr } = await supabase.rpc('match_tenant_rag_chunks', {
    query_embedding: formatVectorForPg(queryEmbedding),
    match_count: RAG_TOP_K,
  })

  if (rpcErr) {
    console.error('[inquiry-chat] rpc', rpcErr)
    return { ok: false, error: '検索に失敗しました' }
  }

  const rows = (hits ?? []) as {
    id: string
    content: string
    metadata: { document_title?: string }
  }[]

  const contextBlocks = rows.map((r, i) => {
    const title = r.metadata?.document_title || '文書'
    return `【資料${i + 1}: ${title}】\n${r.content}`
  })

  const systemPrompt = `あなたは社内の人事・制度に関する問合せに答えるアシスタントです。
以下の「参照資料」に書かれている内容のみを根拠に回答してください。
参照資料にないことは推測せず、「登録された資料には記載がありません」と述べてください。
回答は日本語で簡潔に。最後に「重要: 最終的な判断は必ず人事担当へご確認ください」と一文入れてください。`

  const userContent =
    contextBlocks.length > 0
      ? `${systemPrompt}\n\n参照資料:\n${contextBlocks.join('\n\n---\n\n')}\n\nユーザーの質問:\n${message}`
      : `${systemPrompt}\n\n参照資料はありません。\n\nユーザーの質問:\n${message}`

  let answer: string
  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            contextBlocks.length > 0
              ? `参照資料:\n${contextBlocks.join('\n\n---\n\n')}\n\n質問: ${message}`
              : `参照資料は登録されていません。質問: ${message}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })
    answer = completion.choices[0]?.message?.content?.trim() || ''
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI 応答に失敗しました'
    return { ok: false, error: msg }
  }

  if (!answer) return { ok: false, error: 'AI からの応答が空でした' }

  const citations: InquiryCitation[] = rows.slice(0, 5).map((r) => ({
    title: (r.metadata?.document_title as string) || '文書',
    snippet: r.content.slice(0, 200) + (r.content.length > 200 ? '…' : ''),
  }))

  const citedIds = rows.map((r) => r.id)

  const { error: aErr } = await supabase.from('tenant_inquiry_chat_messages').insert({
    tenant_id: user.tenant_id,
    session_id: sessionId,
    user_id: user.id,
    role: 'assistant',
    content: answer,
    cited_chunk_ids: citedIds.length ? citedIds : null,
  })
  if (aErr) {
    console.error('[inquiry-chat] assistant msg', aErr)
    return { ok: false, error: '応答の保存に失敗しました' }
  }

  await supabase
    .from('tenant_inquiry_chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { ok: true, sessionId, answer, citations }
}
