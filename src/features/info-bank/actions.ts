'use server'

import { revalidatePath } from 'next/cache'
import { Buffer } from 'node:buffer'

import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import { APP_ROUTES } from '@/config/routes'
import { embedChunks } from '@/features/inquiry-chat/embedding'

import { requireInfoBankAdmin, type AdminContext } from './auth'
import { INFO_BANK_BUCKET } from './constants'
import { validateUpload } from './file-policy'
import { embedNextBatch, extractAndStoreChunks, type IngestDeps, type IngestResult } from './ingest'
import { getIngestProgress, type IngestProgress } from './queries'
import { documentMetaSchema, firstIssueMessage, type DocumentMetaInput } from './schema'
import { buildStoragePath, isTenantOwnedPath } from './storage-path'

type Admin = Extract<AdminContext, { ok: true }>
type Result<T extends object = object> = IngestResult<T>

interface UploadedFile {
  path: string
  filename: string
  size: number
}

const SIGNED_DOWNLOAD_SECONDS = 60

function refresh(): void {
  revalidatePath(APP_ROUTES.TENANT.ADMIN_INFO_BANK_MNT)
}

function buildDeps(ctx: Admin): IngestDeps {
  return {
    supabase: ctx.supabase,
    loadFile: async path => {
      const { data, error } = await ctx.supabase.storage.from(INFO_BANK_BUCKET).download(path)
      if (error || !data) throw new Error('アップロードされたファイルを取得できませんでした')
      return Buffer.from(await data.arrayBuffer())
    },
    removeFiles: async paths => {
      const { error } = await ctx.supabase.storage.from(INFO_BANK_BUCKET).remove(paths)
      if (error) throw new Error(error.message)
    },
    embed: texts => embedChunks(texts),
  }
}

/** 取り込み中の版のファイル情報として保存する値。mime は拡張子からサーバー側で決める */
function validateUploadedFile(
  ctx: Admin,
  upload: UploadedFile
): { ok: true; mime: string } | { ok: false; error: string } {
  if (!isTenantOwnedPath(ctx.tenantId, upload.path)) {
    return { ok: false, error: 'アップロード先が不正です。もう一度アップロードしてください' }
  }
  return validateUpload({ name: upload.filename, size: upload.size, mime: '' })
}

async function removeStorageFiles(ctx: Admin, paths: (string | null)[]): Promise<void> {
  const targets = paths.filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (targets.length === 0) return
  const { error } = await ctx.supabase.storage.from(INFO_BANK_BUCKET).remove(targets)
  if (error) console.error('[info-bank] storage remove', error.message)
}

/** ブラウザから Storage へ直接アップロードするための署名付き URL を発行する */
export async function createUploadUrlAction(input: {
  filename: string
  size: number
}): Promise<Result<{ path: string; token: string }>> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return ctx

  const checked = validateUpload({ name: input.filename, size: input.size, mime: '' })
  if (checked.ok === false) return checked

  const path = buildStoragePath(ctx.tenantId, input.filename)
  const { data, error } = await ctx.supabase.storage
    .from(INFO_BANK_BUCKET)
    .createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[info-bank] createSignedUploadUrl', error?.message)
    return { ok: false, error: 'アップロードの準備に失敗しました' }
  }
  return { ok: true, path: data.path, token: data.token }
}

/** 新しい資料を登録する（本文の取り込みは ingestExtractAction 以降で行う） */
export async function registerDocumentAction(
  meta: DocumentMetaInput,
  upload: UploadedFile
): Promise<Result<{ documentId: string }>> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return ctx

  const parsed = documentMetaSchema.safeParse(meta)
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) }
  const file = validateUploadedFile(ctx, upload)
  if (file.ok === false) return file

  const { data, error } = await ctx.supabase
    .from('info_bank_documents')
    .insert({
      tenant_id: ctx.tenantId,
      ...parsed.data,
      created_by: ctx.userId,
      revision: 0,
      pending_revision: 1,
      pending_filename: upload.filename,
      pending_mime_type: file.mime,
      pending_byte_size: upload.size,
      pending_storage_path: upload.path,
      status: 'uploaded',
    })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[info-bank] registerDocument', error)
    return { ok: false, error: '資料の登録に失敗しました' }
  }
  refresh()
  return { ok: true, documentId: data.id }
}

/** 既存資料の改訂版を登録する。取り込みが終わるまで旧版が公開されたまま残る */
export async function registerRevisionAction(
  documentId: string,
  upload: UploadedFile
): Promise<Result> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return ctx

  const file = validateUploadedFile(ctx, upload)
  if (file.ok === false) return file

  const { data: doc } = await ctx.supabase
    .from('info_bank_documents')
    .select('revision, pending_revision, pending_storage_path')
    .eq('id', documentId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!doc) return { ok: false, error: '資料が見つかりません' }

  // 取り込み途中（または失敗中）の前回の改訂版は破棄して、新しいファイルで作り直す
  if (doc.pending_revision !== null) {
    await ctx.supabase
      .from('info_bank_chunks')
      .delete()
      .eq('document_id', documentId)
      .eq('revision', doc.pending_revision)
    await removeStorageFiles(ctx, [doc.pending_storage_path])
  }

  const { error } = await ctx.supabase
    .from('info_bank_documents')
    .update({
      pending_revision: Math.max(doc.revision, doc.pending_revision ?? 0) + 1,
      pending_filename: upload.filename,
      pending_mime_type: file.mime,
      pending_byte_size: upload.size,
      pending_storage_path: upload.path,
      status: 'uploaded',
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('tenant_id', ctx.tenantId)
  if (error) {
    console.error('[info-bank] registerRevision', error)
    return { ok: false, error: '改訂版の登録に失敗しました' }
  }
  refresh()
  return { ok: true }
}

/** 取り込み 1 段階目: 本文を抽出してチャンクを保存する */
export async function ingestExtractAction(
  documentId: string
): Promise<Result<{ chunkCount: number }>> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return ctx
  const result = await extractAndStoreChunks(buildDeps(ctx), documentId, ctx.tenantId)
  refresh()
  return result
}

/** 取り込み 2 段階目: 埋め込みを 1 バッチ処理する。remaining が 0 になると公開版へ切り替わる */
export async function ingestEmbedBatchAction(
  documentId: string
): Promise<Result<{ remaining: number; published: boolean }>> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return ctx
  const result = await embedNextBatch(buildDeps(ctx), documentId, ctx.tenantId)
  if (result.ok && result.published) refresh()
  return result
}

export async function getIngestProgressAction(documentId: string): Promise<IngestProgress | null> {
  return getIngestProgress(documentId)
}

/** タイトル・カテゴリ・タグ・キーワード・要約を更新する（ファイルは変わらない） */
export async function updateDocumentMetaAction(
  documentId: string,
  meta: DocumentMetaInput
): Promise<Result> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return ctx

  const parsed = documentMetaSchema.safeParse(meta)
  if (!parsed.success) return { ok: false, error: firstIssueMessage(parsed.error) }

  const { data, error } = await ctx.supabase
    .from('info_bank_documents')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('tenant_id', ctx.tenantId)
    .select('id')
  if (error || !data || data.length === 0) {
    return { ok: false, error: '資料の更新に失敗しました' }
  }
  refresh()
  return { ok: true }
}

/** 資料を削除する（チャンクは CASCADE、Storage のファイルも削除） */
export async function deleteDocumentAction(documentId: string): Promise<Result> {
  const ctx = await requireInfoBankAdmin()
  if (ctx.ok === false) return ctx

  const { data: doc } = await ctx.supabase
    .from('info_bank_documents')
    .select('storage_path, pending_storage_path')
    .eq('id', documentId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle()
  if (!doc) return { ok: false, error: '資料が見つかりません' }

  const { error } = await ctx.supabase
    .from('info_bank_documents')
    .delete()
    .eq('id', documentId)
    .eq('tenant_id', ctx.tenantId)
  if (error) {
    console.error('[info-bank] deleteDocument', error)
    return { ok: false, error: '資料の削除に失敗しました' }
  }
  await removeStorageFiles(ctx, [doc.storage_path, doc.pending_storage_path])
  refresh()
  return { ok: true }
}

/**
 * 出典の元ファイルを開くための署名付き URL を発行する（有効 60 秒）。
 * 閲覧可否は呼び出しユーザーの RLS で判定し（公開済みの自テナント資料のみ見える）、
 * 判定を通った場合に限って、Storage の署名だけを service_role で行う。
 */
export async function getSourceDownloadUrlAction(
  documentId: string
): Promise<Result<{ url: string }>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { ok: false, error: 'ログイン情報が無効です' }

  const supabase = await createClient()
  const { data: visible } = await supabase
    .from('info_bank_documents')
    .select('id, original_filename')
    .eq('id', documentId)
    .maybeSingle()
  if (!visible) return { ok: false, error: '資料が見つかりません' }

  try {
    const admin = createAdminServiceClient()
    const { data: row } = await admin
      .from('info_bank_documents')
      .select('storage_path, tenant_id')
      .eq('id', documentId)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle()
    if (!row?.storage_path) return { ok: false, error: 'ファイルがありません' }

    const { data, error } = await admin.storage
      .from(INFO_BANK_BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_DOWNLOAD_SECONDS, {
        download: visible.original_filename ?? true,
      })
    if (error || !data) return { ok: false, error: 'ファイルを開けませんでした' }
    return { ok: true, url: data.signedUrl }
  } catch (e) {
    console.error('[info-bank] getSourceDownloadUrl', e instanceof Error ? e.message : e)
    return { ok: false, error: 'ファイルを開けませんでした' }
  }
}
