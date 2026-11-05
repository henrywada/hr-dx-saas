import { requireInfoBankAdmin } from './auth'
import type { IngestStatus } from './types'

/** 管理画面の一覧 1 行 */
export interface InfoBankDocumentRow {
  id: string
  title: string
  category: string
  tags: string[]
  keywords: string[]
  summary: string
  /** 公開中の版のファイル名（未公開なら取り込み中のファイル名） */
  filename: string | null
  byteSize: number | null
  revision: number
  isPublished: boolean
  /** 取り込み中の版があるか（改訂中を含む） */
  hasPending: boolean
  status: IngestStatus
  errorMessage: string | null
  updatedAt: string
}

export interface IngestProgress {
  status: IngestStatus
  errorMessage: string | null
  /** 取り込み中の版のチャンク総数（0 なら本文の抽出がまだ） */
  pendingTotal: number
  /** 埋め込みが未完了のチャンク数 */
  pendingRemaining: number
}

/** 管理者向けの資料一覧（新しい順）。管理者以外・未ログインは空配列 */
export async function listInfoBankDocuments(): Promise<InfoBankDocumentRow[]> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return []

  const { data, error } = await ctx.supabase
    .from('info_bank_documents')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[info-bank] listInfoBankDocuments', error)
    return []
  }
  return data.map(d => ({
    id: d.id,
    title: d.title,
    category: d.category,
    tags: d.tags,
    keywords: d.keywords,
    summary: d.summary,
    filename: d.original_filename ?? d.pending_filename,
    byteSize: d.byte_size ?? d.pending_byte_size,
    revision: d.revision,
    isPublished: d.published_at !== null,
    hasPending: d.pending_revision !== null,
    status: d.status as IngestStatus,
    errorMessage: d.error_message,
    updatedAt: d.updated_at,
  }))
}

/** 取り込みの進捗（画面のポーリング・再実行の判断に使う） */
export async function getIngestProgress(documentId: string): Promise<IngestProgress | null> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return null

  const { data: doc } = await ctx.supabase
    .from('info_bank_documents')
    .select('status, error_message, pending_revision')
    .eq('id', documentId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!doc) return null

  let pendingTotal = 0
  let pendingRemaining = 0
  if (doc.pending_revision !== null) {
    const base = () =>
      ctx.supabase
        .from('info_bank_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', documentId)
        .eq('revision', doc.pending_revision as number)
    const [{ count: total }, { count: remaining }] = await Promise.all([
      base(),
      base().is('embedding', null),
    ])
    pendingTotal = total ?? 0
    pendingRemaining = remaining ?? 0
  }
  return {
    status: doc.status as IngestStatus,
    errorMessage: doc.error_message,
    pendingTotal,
    pendingRemaining,
  }
}
