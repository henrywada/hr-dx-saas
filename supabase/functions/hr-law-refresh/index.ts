import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { chunkPlainText, extractTextFromHtml } from './chunk.ts'
import { searchSerpApi, getSerpApiSearchesLeft } from './serpapi.ts'
import { summarizeLawArticle, embedChunksBatch, formatVectorForPg } from './gemini.ts'
import { sendQuotaWarningEmail } from './mailer.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** 1トピックあたりの検索結果上位件数 */
const RESULTS_PER_SOURCE = 3
/** 1回の実行で処理する最大トピック数（Edge Function の実行時間制限対策） */
const MAX_SOURCES_PER_RUN = 10
/** SerpAPI 残量警告の閾値 */
const SERPAPI_QUOTA_WARNING_THRESHOLD = 50

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * チャンク作成（embedding 生成・登録）に失敗した際、既に登録済みの
 * hr_law_documents 行を補償的に削除する。content_hash の UNIQUE 制約により、
 * 削除しないと次回実行時の dedup チェックで再処理が永久にブロックされてしまうため。
 * ベストエフォートのクリーンアップであり、削除自体が失敗しても関数はクラッシュさせない。
 */
async function deleteOrphanedDocument(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  docId: string
): Promise<void> {
  const { error: cleanupError } = await supabase.from('hr_law_documents').delete().eq('id', docId)
  if (cleanupError) {
    console.error('[hr-law-refresh] 孤立文書の削除に失敗しました', docId, cleanupError)
  }
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const serpApiKey = Deno.env.get('SERPAPI_API_KEY') ?? ''
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    const alertEmail = Deno.env.get('SAAS_ALERT_EMAIL')

    if (!serpApiKey || !geminiApiKey) {
      throw new Error('SERPAPI_API_KEY または GEMINI_API_KEY が未設定です')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let body: { sourceId?: string } = {}
    try {
      body = await req.json()
    } catch {
      // body なしの呼び出し（cron からの空リクエスト）を許容
    }

    // SerpAPI 残量チェック（ラン継続を妨げない）
    try {
      const searchesLeft = await getSerpApiSearchesLeft(serpApiKey)
      if (searchesLeft != null && searchesLeft < SERPAPI_QUOTA_WARNING_THRESHOLD && alertEmail) {
        await sendQuotaWarningEmail(alertEmail, searchesLeft)
      }
    } catch (e) {
      console.error('[hr-law-refresh] SerpAPI 残量チェックに失敗しました', e)
    }

    let sourcesQuery = supabase
      .from('hr_law_sources')
      .select('id, topic, search_query')
      .eq('enabled', true)

    if (body.sourceId) {
      sourcesQuery = sourcesQuery.eq('id', body.sourceId)
    } else {
      sourcesQuery = sourcesQuery.limit(MAX_SOURCES_PER_RUN)
    }

    const { data: sources, error: sourcesError } = await sourcesQuery
    if (sourcesError) throw sourcesError

    let documentsCreated = 0
    let documentsSkipped = 0
    const errors: string[] = []

    for (const source of sources ?? []) {
      try {
        const results = await searchSerpApi(serpApiKey, source.search_query, RESULTS_PER_SOURCE)

        for (const result of results) {
          try {
            const pageRes = await fetch(result.link)
            if (!pageRes.ok) {
              documentsSkipped++
              continue
            }
            const html = await pageRes.text()
            const bodyText = extractTextFromHtml(html)
            if (bodyText.length < 100) {
              documentsSkipped++
              continue
            }

            const contentHash = await sha256Hex(bodyText)

            const { data: existing } = await supabase
              .from('hr_law_documents')
              .select('id')
              .eq('content_hash', contentHash)
              .maybeSingle()

            if (existing) {
              documentsSkipped++
              continue
            }

            const summary = await summarizeLawArticle(
              geminiApiKey,
              result.title,
              result.link,
              bodyText
            )
            if (!summary) {
              documentsSkipped++
              continue
            }

            const { data: doc, error: docError } = await supabase
              .from('hr_law_documents')
              .insert({
                source_id: source.id,
                title: summary.title,
                source_url: result.link,
                content_hash: contentHash,
                summary: summary.summary,
                published_at: summary.publishedAt,
              })
              .select('id, fetched_at')
              .single()

            if (docError || !doc) {
              errors.push(`${source.topic}: 文書登録失敗 ${docError?.message}`)
              continue
            }

            const chunks = chunkPlainText(summary.summary)
            if (chunks.length === 0) {
              documentsCreated++
              continue
            }

            // チャンク作成（embedding 生成 + 登録）に失敗した場合、
            // 既に登録済みの hr_law_documents 行が孤立（チャンクゼロ）しないよう
            // 補償的に削除する。content_hash の UNIQUE 制約により、削除しないと
            // 次回実行時のdedupチェックで再処理が永久にブロックされてしまうため。
            let chunkRows: {
              document_id: string
              chunk_index: number
              content: string
              embedding: string
              metadata: Record<string, unknown>
            }[]
            try {
              const embeddings = await embedChunksBatch(geminiApiKey, chunks)
              chunkRows = chunks.map((content, i) => ({
                document_id: doc.id,
                chunk_index: i,
                content,
                embedding: formatVectorForPg(embeddings[i]),
                metadata: {
                  document_title: summary.title,
                  source_url: result.link,
                  fetched_at: doc.fetched_at,
                },
              }))
            } catch (e) {
              errors.push(
                `${source.topic}: チャンク登録失敗 ${e instanceof Error ? e.message : String(e)}`
              )
              await deleteOrphanedDocument(supabase, doc.id)
              continue
            }

            const { error: chunkError } = await supabase.from('hr_law_chunks').insert(chunkRows)
            if (chunkError) {
              errors.push(`${source.topic}: チャンク登録失敗 ${chunkError.message}`)
              await deleteOrphanedDocument(supabase, doc.id)
              continue
            }

            documentsCreated++
          } catch (e) {
            errors.push(`${source.topic}: ${e instanceof Error ? e.message : String(e)}`)
          }
        }

        await supabase
          .from('hr_law_sources')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', source.id)
      } catch (e) {
        errors.push(`${source.topic}: 検索失敗 ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sourcesProcessed: (sources ?? []).length,
        documentsCreated,
        documentsSkipped,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
