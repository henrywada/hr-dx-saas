/**
 * tenant_rag_chunks.embedding を Gemini で再生成するスクリプト
 *
 * 背景:
 *   埋め込みプロバイダを OpenAI(text-embedding-3-small) から
 *   Gemini(gemini-embedding-001, 1536次元) へ移行したため、
 *   既存の保存済みベクトルは別空間となり類似検索が機能しない。
 *   content から全チャンクを再エンベディングして embedding 列を上書きする。
 *
 * 安全性:
 *   - embedding 列を UPDATE するのみ。行・content は一切削除しない。
 *   - RLS をバイパスする service_role で全テナントを横断処理する（バッチ用途）。
 *
 * 使用方法:
 *   npm run reembed-rag-chunks                # 実行
 *   npm run reembed-rag-chunks -- --dry-run   # 件数確認のみ（書き込みなし）
 *
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { embedChunks, formatVectorForPg } from '../src/features/inquiry-chat/embedding'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const dryRun = process.argv.includes('--dry-run')

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'エラー: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください'
  )
  process.exit(1)
}
// dry-run は件数確認のみで Gemini を呼ばないため、実行時のみ必須とする
if (!dryRun && !process.env.GEMINI_API_KEY) {
  console.error('エラー: GEMINI_API_KEY を .env.local に設定してください')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** 一度に取得・処理するチャンク数（埋め込みAPIのレート上限を考慮） */
const PAGE = 50

type ChunkRow = { id: string; content: string }

async function main() {
  const { count, error: countError } = await admin
    .from('tenant_rag_chunks')
    .select('id', { count: 'exact', head: true })

  if (countError) {
    console.error('件数取得に失敗:', countError.message)
    process.exit(1)
  }

  console.log(`対象チャンク数: ${count ?? 0}`)
  if (dryRun) {
    console.log('[dry-run] 書き込みは行いません。終了します。')
    return
  }
  if (!count || count === 0) return

  let processed = 0
  let offset = 0

  // id 昇順でページングしながら全件を再エンベディング
  for (;;) {
    const { data, error } = await admin
      .from('tenant_rag_chunks')
      .select('id, content')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)

    if (error) {
      console.error(`取得失敗 (offset=${offset}):`, error.message)
      process.exit(1)
    }
    const rows = (data ?? []) as ChunkRow[]
    if (rows.length === 0) break

    const contents = rows.map(r => r.content ?? '')
    const vectors = await embedChunks(contents)

    // 1 行ずつ embedding 列を更新（content は触らない）
    for (let i = 0; i < rows.length; i++) {
      const { error: updErr } = await admin
        .from('tenant_rag_chunks')
        .update({ embedding: formatVectorForPg(vectors[i]) })
        .eq('id', rows[i].id)
      if (updErr) {
        console.error(`更新失敗 (id=${rows[i].id}):`, updErr.message)
        process.exit(1)
      }
    }

    processed += rows.length
    offset += PAGE
    console.log(`進捗: ${processed}/${count}`)
  }

  console.log(`完了: ${processed} 件のチャンクを Gemini で再エンベディングしました`)
}

main().catch(e => {
  console.error('予期せぬエラー:', e)
  process.exit(1)
})
