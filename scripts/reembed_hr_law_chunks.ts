/**
 * hr_law_chunks を Gemini (gemini-embedding-001 / 1536次元) で再埋め込みする。
 *
 * 背景:
 *   法令RAGの埋め込みは OpenAI text-embedding-3-small（OpenRouter経由）だったが、
 *   日本語の法令文書では類似度が 0.24〜0.40 に圧縮され、関連チャンクより
 *   無関係チャンクが上位に来る状態だった（本番実測）。社内資料RAGと同じ
 *   Gemini へ統一し、taskType（質問=RETRIEVAL_QUERY / 文書=RETRIEVAL_DOCUMENT）
 *   を使い分けることで非対称検索の精度を上げる。
 *
 * 重要:
 *   検索側（src/features/hr-assistant/actions.ts）も Gemini になっていること。
 *   片方だけ切り替えるとベクトル空間が食い違い、検索が機能しなくなる。
 *
 * 安全性:
 *   - 既存行の embedding 列のみ更新する。content・行は一切削除しない。
 *   - デフォルトは dry-run（件数確認のみ）。実書き込みは `--apply` を明示。
 *
 * 使い方:
 *   DOTENV_CONFIG_PATH=.env.prod.local npx tsx scripts/reembed_hr_law_chunks.ts            # dry-run
 *   DOTENV_CONFIG_PATH=.env.prod.local npx tsx scripts/reembed_hr_law_chunks.ts --apply    # 実書き込み
 */
import 'dotenv/config'
import postgres from 'postgres'
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

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL が未設定です')
  if (apply && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY が未設定です（--apply 時は埋め込み生成に必要）')
  }

  console.log('==================================================')
  console.log(`接続先DB : ${describeDbTarget(databaseUrl)}`)
  console.log(`モード   : ${apply ? '★ --apply（embedding 列を更新）' : 'dry-run（書き込みなし）'}`)
  console.log('==================================================')

  const sql = postgres(databaseUrl, postgresOptions(databaseUrl))

  const rows = await sql<{ id: string; content: string }[]>`
    SELECT id, content FROM public.hr_law_chunks ORDER BY created_at ASC
  `
  console.log(`再埋め込み対象: ${rows.length} 件`)

  if (!apply) {
    console.log('dry-run 完了（--apply で実書き込み）')
    await sql.end()
    return
  }

  const BATCH = 32
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const vectors = await embedChunks(batch.map(r => r.content))
    for (let j = 0; j < batch.length; j++) {
      await sql`
        UPDATE public.hr_law_chunks
        SET embedding = ${formatVectorForPg(vectors[j]!)}::vector
        WHERE id = ${batch[j].id}::uuid
      `
    }
    console.log(`進捗: ${Math.min(i + BATCH, rows.length)} / ${rows.length}`)
  }

  await sql.end()
  console.log('完了（Gemini で再埋め込み済み）')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
