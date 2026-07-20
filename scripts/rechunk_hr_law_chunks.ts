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
 *   DOTENV_CONFIG_PATH=.env.prod.local npx tsx scripts/rechunk_hr_law_chunks.ts             # dry-run
 *   DOTENV_CONFIG_PATH=.env.prod.local npx tsx scripts/rechunk_hr_law_chunks.ts --apply      # 実書き込み
 *   （--apply は GEMINI_API_KEY が必要）
 */
import 'dotenv/config'
import postgres from 'postgres'
import { chunkPlainText } from '../src/features/inquiry-chat/chunk'
// 埋め込みは Gemini に統一（検索側と同じベクトル空間に揃えるため）
import { embedChunks, formatVectorForPg } from '../src/features/inquiry-chat/embedding'

const apply = process.argv.includes('--apply')

/** 接続文字列から認証情報を除いたホスト名を取り出す（実行対象の目視確認用） */
function describeDbTarget(databaseUrl: string): string {
  try {
    const u = new URL(databaseUrl)
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`
  } catch {
    return '(解析不能な接続文字列)'
  }
}

/**
 * Supabase の Transaction pooler（ポート 6543）は PgBouncer 経由のため
 * prepared statement が使えない。ポートを見て自動的に無効化する。
 */
function postgresOptions(databaseUrl: string): {
  max: number
  prepare?: boolean
  password?: string
} {
  const options: { max: number; prepare?: boolean; password?: string } = { max: 1 }

  try {
    if (new URL(databaseUrl).port === '6543') options.prepare = false
  } catch {
    // 解析できない場合は既定値
  }

  // パスワードに @ や # 等が含まれる場合、URL へ直書きすると percent-encoding が必要になる。
  // SUPABASE_DB_PASSWORD を指定すればエンコード不要でそのまま渡せる。
  const rawPassword = process.env.SUPABASE_DB_PASSWORD
  if (rawPassword) options.password = rawPassword

  return options
}

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
  if (apply && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY が未設定です（--apply 時は埋め込み生成に必要）')
  }

  // 破壊的操作のため、実行対象のDBを必ず明示する
  console.log('==================================================')
  console.log(`接続先DB : ${describeDbTarget(databaseUrl)}`)
  console.log(
    `モード   : ${apply ? '★ --apply（実書き込み・削除→再挿入）' : 'dry-run（書き込みなし）'}`
  )
  console.log('==================================================')

  const sql = postgres(databaseUrl, postgresOptions(databaseUrl))

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

    const embeddings = await embedChunks(newChunks)
    const rows = newChunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: formatVectorForPg(embeddings[i]!),
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
