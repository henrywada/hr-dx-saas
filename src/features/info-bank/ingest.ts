import type { Buffer } from 'node:buffer'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'
import { chunkPlainText } from '@/features/inquiry-chat/chunk'
import { formatVectorForPg } from '@/features/inquiry-chat/embedding'

import { INFO_BANK_EMBED_BATCH } from './constants'
import { extractInfoBankText, type Extractor } from './extract'

/** チャンク INSERT 1 回あたりの行数（リクエストサイズ対策） */
const CHUNK_INSERT_BATCH = 200

type DocumentRow = Database['public']['Tables']['info_bank_documents']['Row']

/**
 * 取り込みが依存する外部要素。テストでは Storage / Gemini を差し替える。
 * supabase は service_role クライアント（呼び出し側が tenant_id を検証済みであること）。
 */
export interface IngestDeps {
  supabase: SupabaseClient<Database>
  loadFile: (storagePath: string) => Promise<Buffer>
  removeFiles: (storagePaths: string[]) => Promise<void>
  embed: (texts: string[]) => Promise<number[][]>
  /** 本文抽出の差し替え（テスト用） */
  extract?: Extractor
}

export type IngestResult<T> = ({ ok: true } & T) | { ok: false; error: string }

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

async function markFailed(deps: IngestDeps, documentId: string, message: string): Promise<void> {
  const { error } = await deps.supabase
    .from('info_bank_documents')
    .update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() })
    .eq('id', documentId)
  if (error) console.error('[info-bank] markFailed', error)
}

async function loadPendingDocument(
  deps: IngestDeps,
  documentId: string,
  tenantId: string
): Promise<DocumentRow | null> {
  const { data, error } = await deps.supabase
    .from('info_bank_documents')
    .select('*')
    .eq('id', documentId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) {
    console.error('[info-bank] loadPendingDocument', error)
    return null
  }
  if (!data || data.pending_revision == null || !data.pending_storage_path) return null
  return data
}

/**
 * 段階 1: Storage のファイルから本文を抽出し、チャンクを embedding 無しで保存する。
 * 取り込み中の版(pending_revision)のチャンクだけを作り直すため、公開中の版には影響しない。
 */
export async function extractAndStoreChunks(
  deps: IngestDeps,
  documentId: string,
  tenantId: string
): Promise<IngestResult<{ chunkCount: number }>> {
  const doc = await loadPendingDocument(deps, documentId, tenantId)
  if (!doc) return { ok: false, error: '取り込み対象のファイルがありません' }
  const revision = doc.pending_revision as number

  await deps.supabase
    .from('info_bank_documents')
    .update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() })
    .eq('id', documentId)

  try {
    const buffer = await deps.loadFile(doc.pending_storage_path as string)
    const text = await extractInfoBankText(
      buffer,
      doc.pending_mime_type ?? 'application/octet-stream',
      doc.pending_filename ?? '',
      deps.extract ? { extract: deps.extract } : {}
    )
    const chunks = chunkPlainText(text)
    if (chunks.length === 0) throw new Error('本文が空のため登録できませんでした')

    // 途中で失敗して再実行された場合に備え、この版のチャンクを作り直す
    const { error: delErr } = await deps.supabase
      .from('info_bank_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('revision', revision)
    if (delErr) throw new Error('既存チャンクの削除に失敗しました')

    for (let i = 0; i < chunks.length; i += CHUNK_INSERT_BATCH) {
      const rows = chunks.slice(i, i + CHUNK_INSERT_BATCH).map((content, j) => ({
        tenant_id: tenantId,
        document_id: documentId,
        revision,
        chunk_index: i + j,
        content,
      }))
      const { error } = await deps.supabase.from('info_bank_chunks').insert(rows)
      if (error) throw new Error('チャンクの保存に失敗しました')
    }
    return { ok: true, chunkCount: chunks.length }
  } catch (e) {
    const message = toMessage(e, '本文の抽出に失敗しました')
    console.error('[info-bank] extractAndStoreChunks', message)
    await markFailed(deps, documentId, message)
    return { ok: false, error: message }
  }
}

/**
 * 段階 2: embedding が未設定のチャンクを INFO_BANK_EMBED_BATCH 件ずつ埋める。
 * 全件埋まったら公開版へ切り替える（publish_info_bank_revision）。
 * 途中で失敗しても次回の呼び出しが続きから再開できる。公開中の版は切替まで触らない。
 */
export async function embedNextBatch(
  deps: IngestDeps,
  documentId: string,
  tenantId: string
): Promise<IngestResult<{ remaining: number; published: boolean }>> {
  const doc = await loadPendingDocument(deps, documentId, tenantId)
  if (!doc) return { ok: false, error: '取り込み中の版がありません' }
  const revision = doc.pending_revision as number

  try {
    await deps.supabase
      .from('info_bank_documents')
      .update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', documentId)

    const { data: batch, error: batchErr } = await deps.supabase
      .from('info_bank_chunks')
      .select('id, tenant_id, document_id, revision, chunk_index, content')
      .eq('document_id', documentId)
      .eq('revision', revision)
      .is('embedding', null)
      .order('chunk_index')
      .limit(INFO_BANK_EMBED_BATCH)
    if (batchErr) throw new Error('チャンクの取得に失敗しました')

    if (batch.length > 0) {
      const vectors = await deps.embed(batch.map(c => c.content))
      if (vectors.length !== batch.length) {
        throw new Error('埋め込みの件数がチャンク数と一致しません')
      }
      const rows = batch.map((c, i) => ({ ...c, embedding: formatVectorForPg(vectors[i]!) }))
      const { error } = await deps.supabase
        .from('info_bank_chunks')
        .upsert(rows, { onConflict: 'id' })
      if (error) throw new Error('埋め込みの保存に失敗しました')
    }

    const { count, error: countErr } = await deps.supabase
      .from('info_bank_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', documentId)
      .eq('revision', revision)
      .is('embedding', null)
    if (countErr || count == null) throw new Error('残件数の取得に失敗しました')
    if (count > 0) return { ok: true, remaining: count, published: false }

    const { data: oldPath, error: pubErr } = await deps.supabase.rpc('publish_info_bank_revision', {
      p_document_id: documentId,
      p_revision: revision,
    })
    if (pubErr) throw new Error(pubErr.message)

    // 旧ファイルの削除失敗は公開自体を失敗にしない（孤児ファイルが残るだけ）
    if (oldPath) {
      try {
        await deps.removeFiles([oldPath])
      } catch (e) {
        console.error('[info-bank] 旧ファイルの削除に失敗', toMessage(e, ''))
      }
    }
    return { ok: true, remaining: 0, published: true }
  } catch (e) {
    const message = toMessage(e, '取り込みに失敗しました')
    console.error('[info-bank] embedNextBatch', message)
    await markFailed(deps, documentId, message)
    return { ok: false, error: message }
  }
}
