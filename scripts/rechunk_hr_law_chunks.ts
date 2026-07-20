/**
 * hr_law_chunks を hr_law_documents.detail から再分割・再埋め込みする。
 *
 * 背景:
 *   chunkPlainText のオーバーラップ計算バグにより、文書末尾付近で
 *   1文字ずつずれた準重複チャンクが大量に生成されていた（修正済み）。
 *   本スクリプトは既存チャンクを削除し、修正後のロジックで文書ごとに
 *   再分割・再埋め込みして書き戻す。
 *
 * 安全性:
 *   - デフォルトは dry-run（書き込みなし、件数のみ表示）。
 *     実際に書き込むには `--apply` を明示的に付ける。
 *   - 文書単位でトランザクション化し、削除→挿入を一括コミットする
 *     （挿入失敗時は削除もロールバックされ、チャンクが0件になることはない）。
 *
 * 使い方:
 *   DATABASE_URL=... OPENROUTER_API_KEY=... npx tsx scripts/rechunk_hr_law_chunks.ts             # dry-run
 *   DATABASE_URL=... OPENROUTER_API_KEY=... npx tsx scripts/rechunk_hr_law_chunks.ts --apply      # 実書き込み
 */
import 'dotenv/config'
import postgres from 'postgres'
import { chunkPlainText } from '../src/features/inquiry-chat/chunk'
import { openRouterEmbedTexts, formatOpenRouterVectorForPg } from '../src/lib/ai/openrouter'

const apply = process.argv.includes('--apply')

type DocRow = {
  id: string
  title: string
  source_url: string
  detail: string | null
  fetched_at: string
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL が未設定です')
  if (apply && !process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY が未設定です（--apply 時は埋め込み生成に必要）')
  }

  const sql = postgres(databaseUrl, { max: 1 })

  const docs = await sql<DocRow[]>`
    SELECT id, title, source_url, detail, fetched_at
    FROM public.hr_law_documents
    ORDER BY fetched_at ASC
  `
  console.log(`対象文書: ${docs.length} 件${apply ? '' : '（dry-run: 書き込みなし）'}`)

  let totalOldChunks = 0
  let totalNewChunks = 0
  let skipped = 0

  for (const doc of docs) {
    const detail = (doc.detail ?? '').trim()
    if (!detail) {
      console.log(`[skip] 本文なし: ${doc.title} (${doc.id})`)
      skipped++
      continue
    }

    const [{ count: oldCountRaw }] = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM public.hr_law_chunks WHERE document_id = ${doc.id}::uuid
    `
    const oldCount = Number(oldCountRaw)
    const newChunks = chunkPlainText(detail)

    totalOldChunks += oldCount
    totalNewChunks += newChunks.length

    console.log(
      `${doc.title} (${doc.id}): ${oldCount}件 → ${newChunks.length}件` +
        (oldCount !== newChunks.length ? '  ★変化あり' : '')
    )

    if (!apply) continue

    const embeddings = await openRouterEmbedTexts(newChunks)
    const rows = newChunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: formatOpenRouterVectorForPg(embeddings[i]!),
      metadata: {
        document_title: doc.title,
        source_url: doc.source_url,
        fetched_at: doc.fetched_at,
      },
    }))

    await sql.begin(async tx => {
      await tx`DELETE FROM public.hr_law_chunks WHERE document_id = ${doc.id}::uuid`
      for (const row of rows) {
        await tx`
          INSERT INTO public.hr_law_chunks (document_id, chunk_index, content, embedding, metadata)
          VALUES (
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
  console.log(`合計: ${totalOldChunks}件 → ${totalNewChunks}件（本文なしでスキップ: ${skipped}件）`)
  console.log(apply ? '完了（書き込み済み）' : 'dry-run 完了（--apply で実書き込み）')

  await sql.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
