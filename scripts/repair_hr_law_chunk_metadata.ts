/**
 * hr_law_chunks.metadata の二重エンコードを修復する。
 *
 * 背景:
 *   バックフィルスクリプトで `${JSON.stringify(obj)}::jsonb` と書いていたため、
 *   postgres.js 側のシリアライズと二重になり、metadata が JSON オブジェクトでは
 *   なく JSON 文字列として保存されていた。その結果 `metadata->>'source_url'` 等が
 *   取り出せず、AI回答の引用が「法令文書」「出典: （空）」になっていた。
 *
 * 修復方法:
 *   親文書（hr_law_documents）の値から jsonb_build_object で組み直す。
 *   SQL 内で完結させるため、クライアント側のシリアライズ問題を回避できる。
 *
 * 安全性:
 *   - metadata 列のみ更新する。content・embedding・行は一切触らない。
 *   - デフォルトは dry-run。実書き込みは `--apply` を明示。
 *
 * 使い方:
 *   DOTENV_CONFIG_PATH=.env.prod.local npx tsx scripts/repair_hr_law_chunk_metadata.ts          # dry-run
 *   DOTENV_CONFIG_PATH=.env.prod.local npx tsx scripts/repair_hr_law_chunk_metadata.ts --apply  # 実書き込み
 */
import 'dotenv/config'
import postgres from 'postgres'

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

  console.log('==================================================')
  console.log(`接続先DB : ${describeDbTarget(databaseUrl)}`)
  console.log(`モード   : ${apply ? '★ --apply（metadata 列を更新）' : 'dry-run（書き込みなし）'}`)
  console.log('==================================================')

  const sql = postgres(databaseUrl, postgresOptions(databaseUrl))

  const before = await sql<{ t: string; n: string }[]>`
    SELECT jsonb_typeof(metadata) AS t, count(*)::text AS n
    FROM public.hr_law_chunks GROUP BY jsonb_typeof(metadata)
  `
  console.log('修復前の metadata 型:')
  before.forEach(r => console.log(`  ${r.t}: ${r.n}件`))

  if (!apply) {
    console.log('dry-run 完了（--apply で実書き込み）')
    await sql.end()
    return
  }

  const updated = await sql`
    UPDATE public.hr_law_chunks c
    SET metadata = jsonb_build_object(
      'document_title', d.title,
      'source_url', d.source_url,
      'fetched_at', d.fetched_at
    )
    FROM public.hr_law_documents d
    WHERE d.id = c.document_id
    RETURNING c.id
  `
  console.log(`更新: ${updated.length}件`)

  const after = await sql<{ t: string; n: string }[]>`
    SELECT jsonb_typeof(metadata) AS t, count(*)::text AS n
    FROM public.hr_law_chunks GROUP BY jsonb_typeof(metadata)
  `
  console.log('修復後の metadata 型:')
  after.forEach(r => console.log(`  ${r.t}: ${r.n}件`))

  const sample = await sql<{ title: string; url: string; fetched: string }[]>`
    SELECT metadata->>'document_title' AS title,
           metadata->>'source_url' AS url,
           metadata->>'fetched_at' AS fetched
    FROM public.hr_law_chunks LIMIT 2
  `
  console.log('取り出し確認:')
  sample.forEach(r => console.log(`  ${r.title?.slice(0, 30)} / ${r.url} / ${r.fetched}`))

  await sql.end()
  console.log('完了')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
