/**
 * tenant_rag_chunks を元テキストから再抽出・再分割・再埋め込みする。
 *
 * 背景:
 *   chunkPlainText のオーバーラップ計算バグにより、文書末尾付近で
 *   1文字ずつずれた準重複チャンクが大量に生成されていた（修正済み）。
 *   本スクリプトは既存チャンクを削除し、修正後のロジックで文書ごとに
 *   再分割・再埋め込みして書き戻す。
 *
 * 元テキストの再取得方法（source_kind 別）:
 *   - file : Supabase Storage の storage_path から元ファイルを再ダウンロードして再抽出
 *   - url  : source_url を再取得して再抽出（掲載内容が変わっている可能性あり）
 *   - paste: 元テキストが DB のどこにも永続化されていないため再構築不可。
 *            安全のため対象から除外し、一覧を出力する（利用者による再登録が必要）。
 *
 * 安全性:
 *   - デフォルトは dry-run（書き込みなし、件数のみ表示）。
 *     実際に書き込むには `--apply` を明示的に付ける。
 *   - 文書単位でトランザクション化し、削除→挿入を一括コミットする
 *     （挿入失敗時は削除もロールバックされ、チャンクが0件になることはない）。
 *   - 元テキストの再取得に失敗した文書（storage欠落・URL到達不可等）は
 *     既存チャンクに一切手を付けず、失敗一覧として出力する。
 *
 * 使い方:
 *   DATABASE_URL=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GEMINI_API_KEY=... \
 *     npx tsx scripts/rechunk_tenant_rag_chunks.ts             # dry-run
 *   同上 + --apply                                              # 実書き込み
 */
import 'dotenv/config'
import { Buffer } from 'node:buffer'
import postgres from 'postgres'
import { createClient } from '@supabase/supabase-js'
import { chunkPlainText } from '../src/features/inquiry-chat/chunk'
import { embedChunks, formatVectorForPg } from '../src/features/inquiry-chat/embedding'
import { extractTextFromUploadedFile } from '../src/features/inquiry-chat/extractors/files'
import { extractTextFromUrl } from '../src/features/inquiry-chat/extractors/url'

const apply = process.argv.includes('--apply')

type DocRow = {
  id: string
  tenant_id: string
  title: string
  source_kind: string
  mime_type: string | null
  original_filename: string | null
  source_url: string | null
  storage_path: string | null
  status: string
}

async function resolvePlainText(
  doc: DocRow,
  supabase: ReturnType<typeof createClient>
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  if (doc.source_kind === 'file') {
    if (!doc.storage_path) return { ok: false, reason: 'storage_path が未設定です' }
    const { data, error } = await supabase.storage.from('tenant_rag').download(doc.storage_path)
    if (error || !data) return { ok: false, reason: `Storage ダウンロード失敗: ${error?.message}` }
    const buf = Buffer.from(await data.arrayBuffer())
    try {
      const text = await extractTextFromUploadedFile(
        buf,
        doc.mime_type ?? 'application/octet-stream',
        doc.original_filename ?? doc.title
      )
      return { ok: true, text }
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : String(e) }
    }
  }

  if (doc.source_kind === 'url') {
    if (!doc.source_url) return { ok: false, reason: 'source_url が未設定です' }
    try {
      const extracted = await extractTextFromUrl(doc.source_url)
      return { ok: true, text: extracted.text }
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : String(e) }
    }
  }

  return { ok: false, reason: 'paste は元テキストを再構築できません（再登録が必要）' }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL が未設定です')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です')
  }
  if (apply && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY が未設定です（--apply 時は埋め込み生成に必要）')
  }

  const sql = postgres(databaseUrl, { max: 1 })
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const docs = await sql<DocRow[]>`
    SELECT id, tenant_id, title, source_kind, mime_type, original_filename, source_url, storage_path, status
    FROM public.tenant_rag_documents
    WHERE status = 'ready'
    ORDER BY created_at ASC
  `
  console.log(`対象文書: ${docs.length} 件${apply ? '' : '（dry-run: 書き込みなし）'}`)

  let totalOldChunks = 0
  let totalNewChunks = 0
  const skippedPaste: string[] = []
  const failed: { id: string; title: string; reason: string }[] = []

  for (const doc of docs) {
    const [{ count: oldCountRaw }] = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM public.tenant_rag_chunks WHERE document_id = ${doc.id}::uuid
    `
    const oldCount = Number(oldCountRaw)

    const resolved = await resolvePlainText(doc, supabase)
    if (!resolved.ok) {
      if (doc.source_kind === 'paste') {
        skippedPaste.push(`${doc.title} (tenant=${doc.tenant_id}, id=${doc.id})`)
      } else {
        failed.push({ id: doc.id, title: doc.title, reason: resolved.reason })
      }
      continue
    }

    const newChunks = chunkPlainText(resolved.text)
    if (newChunks.length === 0) {
      failed.push({ id: doc.id, title: doc.title, reason: '再抽出した本文が空でした' })
      continue
    }

    totalOldChunks += oldCount
    totalNewChunks += newChunks.length
    console.log(
      `[${doc.source_kind}] ${doc.title} (${doc.id}): ${oldCount}件 → ${newChunks.length}件` +
        (oldCount !== newChunks.length ? '  ★変化あり' : '')
    )

    if (!apply) continue

    const embeddings = await embedChunks(newChunks)
    const rows = newChunks.map((content, i) => ({
      tenant_id: doc.tenant_id,
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: formatVectorForPg(embeddings[i]!),
      metadata: {
        document_title: doc.title,
        source_kind: doc.source_kind,
        chunk_index: i,
      },
    }))

    await sql.begin(async tx => {
      await tx`DELETE FROM public.tenant_rag_chunks WHERE document_id = ${doc.id}::uuid`
      for (const row of rows) {
        await tx`
          INSERT INTO public.tenant_rag_chunks
            (tenant_id, document_id, chunk_index, content, embedding, metadata)
          VALUES (
            ${row.tenant_id}::uuid,
            ${row.document_id}::uuid,
            ${row.chunk_index},
            ${row.content},
            ${row.embedding}::vector,
            ${JSON.stringify(row.metadata)}::jsonb
          )
        `
      }
    })
  }

  console.log('---')
  console.log(`合計: ${totalOldChunks}件 → ${totalNewChunks}件`)
  console.log(apply ? '完了（書き込み済み）' : 'dry-run 完了（--apply で実書き込み）')

  if (skippedPaste.length > 0) {
    console.log('---')
    console.log(
      `[paste] 元テキストを再構築できず対象外にした文書（${skippedPaste.length}件）。` +
        '利用者に再登録を案内してください:'
    )
    skippedPaste.forEach(s => console.log(`  - ${s}`))
  }

  if (failed.length > 0) {
    console.log('---')
    console.log(`再取得に失敗した文書（${failed.length}件、既存チャンクは変更していません）:`)
    failed.forEach(f => console.log(`  - ${f.title} (${f.id}): ${f.reason}`))
  }

  await sql.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
