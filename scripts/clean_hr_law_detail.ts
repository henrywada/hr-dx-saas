/**
 * 既存 hr_law_documents.detail から要約プロンプト由来の定型見出しを除去し、
 * チャンクを再生成・再埋め込みする。
 *
 * 背景:
 *   要約プロンプトのチェック項目（「### 不確かな点は書かない（推測禁止）」等）が
 *   detail の見出しとして出力され、全文書で同一の文字列が繰り返されていた。
 *   これにより埋め込みの特徴が薄まり、無関係な質問に対して定型文チャンクが
 *   類似度1位になる状態だった（実測 116チャンク中29件が該当）。
 *
 * 安全性:
 *   - デフォルトは dry-run（書き込みなし）。実書き込みは `--apply` を明示。
 *   - detail の更新とチャンク再生成を文書単位のトランザクションで実行。
 *   - 定型見出しを含まない文書は変更しない（チャンクも再生成しない）。
 *
 * 使い方:
 *   DOTENV_CONFIG_PATH=.env.prod.local npx tsx scripts/clean_hr_law_detail.ts           # dry-run
 *   DOTENV_CONFIG_PATH=.env.prod.local npx tsx scripts/clean_hr_law_detail.ts --apply   # 実書き込み
 */
import 'dotenv/config'
import postgres from 'postgres'
import { chunkPlainText } from '../src/features/inquiry-chat/chunk'
import { stripSummaryBoilerplate } from '../src/features/hr-assistant/law-detail-cleaner'
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

  console.log('==================================================')
  console.log(`接続先DB : ${describeDbTarget(databaseUrl)}`)
  console.log(`モード   : ${apply ? '★ --apply（実書き込み）' : 'dry-run（書き込みなし）'}`)
  console.log('==================================================')

  const sql = postgres(databaseUrl, postgresOptions(databaseUrl))

  const docs = await sql<DocRow[]>`
    SELECT id, title, source_url, detail, fetched_at
    FROM public.hr_law_documents
    ORDER BY fetched_at ASC
  `

  let changed = 0
  let unchanged = 0
  let totalRemovedChars = 0

  for (const doc of docs) {
    const original = (doc.detail ?? '').trim()
    if (!original) {
      unchanged++
      continue
    }

    const cleaned = stripSummaryBoilerplate(original)
    if (cleaned === original) {
      unchanged++
      continue
    }

    changed++
    totalRemovedChars += original.length - cleaned.length
    const newChunks = chunkPlainText(cleaned)
    console.log(
      `${doc.title.slice(0, 40)} (${doc.id}): ${original.length}字 → ${cleaned.length}字 / チャンク${newChunks.length}件`
    )

    if (!apply) continue

    const embeddings = await embedChunks(newChunks)
    const rows = newChunks.map((content, i) => ({
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
      await tx`UPDATE public.hr_law_documents SET detail = ${cleaned} WHERE id = ${doc.id}::uuid`
      await tx`DELETE FROM public.hr_law_chunks WHERE document_id = ${doc.id}::uuid`
      for (const row of rows) {
        await tx`
          INSERT INTO public.hr_law_chunks (document_id, chunk_index, content, embedding, metadata)
          VALUES (
            ${doc.id}::uuid,
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
  console.log(`定型文を除去した文書: ${changed}件 / 変更なし: ${unchanged}件`)
  console.log(`除去した合計文字数: ${totalRemovedChars}字`)
  console.log(apply ? '完了（書き込み済み）' : 'dry-run 完了（--apply で実書き込み）')

  await sql.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
