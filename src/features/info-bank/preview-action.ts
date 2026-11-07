'use server'

import { Buffer } from 'node:buffer'

import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'

import { z } from 'zod'

import { INFO_BANK_BUCKET } from './constants'
import { extractInfoBankText } from './extract'
import { extractPdfPages } from './extract-pdf-pages'
import { locatePage } from './locate-page'

const PREVIEW_URL_SECONDS = 60

/** 出典の抜粋（ページ特定にだけ使う。件数・長さは検索の上限に合わせて絞る） */
const excerptsSchema = z.array(z.string().max(2000)).max(10)

export type SourcePreview =
  | { kind: 'pdf'; title: string; filename: string; url: string; page: number | null }
  | { kind: 'text'; title: string; filename: string; text: string }

export type SourcePreviewResult =
  | { ok: true; preview: SourcePreview }
  | { ok: false; error: string }

function isPdf(mime: string | null, filename: string | null): boolean {
  return mime === 'application/pdf' || (filename ?? '').toLowerCase().endsWith('.pdf')
}

/** 引用箇所のページ番号。特定できない・失敗した場合は null（先頭ページを開くだけで表示自体は続ける） */
async function findCitedPage(
  bucket: ReturnType<ReturnType<typeof createAdminServiceClient>['storage']['from']>,
  storagePath: string,
  excerpts: string[]
): Promise<number | null> {
  if (excerpts.length === 0) return null
  try {
    const { data: blob, error } = await bucket.download(storagePath)
    if (error || !blob) return null
    const pages = await extractPdfPages(Buffer.from(await blob.arrayBuffer()))
    return locatePage(pages, excerpts)
  } catch (e) {
    console.error('[info-bank] findCitedPage', e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * 出典の元ファイルをモーダルで表示するための情報を返す。
 * - PDF: 表示用の署名付き URL（ダウンロード指定なし・有効 60 秒）と、excerpts が載っているページ番号
 * - それ以外（Word / Excel / CSV / テキスト）: ブラウザで描画できないため、取り込み時と同じ方法で抽出した本文
 * 閲覧可否は呼び出しユーザーの RLS（公開済みの自テナント資料のみ）で判定し、通った場合だけ service_role で Storage を読む。
 */
export async function getSourcePreviewAction(
  documentId: string,
  excerpts: string[] = []
): Promise<SourcePreviewResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { ok: false, error: 'ログイン情報が無効です' }

  const parsedExcerpts = excerptsSchema.safeParse(excerpts)
  if (!parsedExcerpts.success) return { ok: false, error: '引用箇所の指定が不正です' }

  const supabase = await createClient()
  const { data: visible } = await supabase
    .from('info_bank_documents')
    .select('id, title')
    .eq('id', documentId)
    .eq('tenant_id', user.tenant_id)
    .not('published_at', 'is', null)
    .maybeSingle()
  if (!visible) return { ok: false, error: '資料が見つかりません' }

  try {
    const admin = createAdminServiceClient()
    const { data: row } = await admin
      .from('info_bank_documents')
      .select('storage_path, original_filename, mime_type')
      .eq('id', documentId)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle()
    if (!row?.storage_path) return { ok: false, error: 'ファイルがありません' }

    const filename = row.original_filename ?? visible.title
    const bucket = admin.storage.from(INFO_BANK_BUCKET)

    if (isPdf(row.mime_type, row.original_filename)) {
      const { data, error } = await bucket.createSignedUrl(row.storage_path, PREVIEW_URL_SECONDS)
      if (error || !data) return { ok: false, error: 'ファイルを開けませんでした' }
      const page = await findCitedPage(bucket, row.storage_path, parsedExcerpts.data)
      return {
        ok: true,
        preview: { kind: 'pdf', title: visible.title, filename, url: data.signedUrl, page },
      }
    }

    const { data: blob, error } = await bucket.download(row.storage_path)
    if (error || !blob) return { ok: false, error: 'ファイルを開けませんでした' }
    const text = await extractInfoBankText(
      Buffer.from(await blob.arrayBuffer()),
      row.mime_type ?? 'application/octet-stream',
      filename
    )
    return { ok: true, preview: { kind: 'text', title: visible.title, filename, text } }
  } catch (e) {
    console.error('[info-bank] getSourcePreview', e instanceof Error ? e.message : e)
    return { ok: false, error: 'ファイルを表示できませんでした' }
  }
}
