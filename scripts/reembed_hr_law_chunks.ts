/**
 * hr_law_chunks を OpenRouter text-embedding-3-small (1536) で再埋め込みする。
 * 使い方: OPENROUTER_API_KEY=... DATABASE_URL=... npx tsx scripts/reembed_hr_law_chunks.ts
 *
 * 注意: supabase db reset は使わない。既存行の embedding 列のみ更新する。
 */
import 'dotenv/config'
import postgres from 'postgres'
import {
  openRouterEmbedTexts,
  formatOpenRouterVectorForPg,
} from '../src/lib/ai/openrouter'

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY が未設定です')
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL が未設定です')

  const sql = postgres(databaseUrl, { max: 1 })
  const rows = await sql<{ id: string; content: string }[]>`
    SELECT id, content FROM public.hr_law_chunks ORDER BY created_at ASC
  `
  console.log(`再埋め込み対象: ${rows.length} 件`)

  const BATCH = 32
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const vectors = await openRouterEmbedTexts(batch.map(r => r.content))
    for (let j = 0; j < batch.length; j++) {
      const vec = formatOpenRouterVectorForPg(vectors[j])
      await sql`
        UPDATE public.hr_law_chunks
        SET embedding = ${vec}::vector
        WHERE id = ${batch[j].id}::uuid
      `
    }
    console.log(`進捗: ${Math.min(i + BATCH, rows.length)} / ${rows.length}`)
  }

  await sql.end()
  console.log('完了')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
