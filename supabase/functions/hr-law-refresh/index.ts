import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { chunkPlainText } from './chunk.ts'
import {
  searchTopicUrls,
  fetchPageText,
  summarizeLawArticle,
  embedChunksBatch,
  formatVectorForPg,
  isAllowedUrl,
} from './openrouter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** 1トピックあたりの検索結果上位件数 */
const RESULTS_PER_SOURCE = 5
/** 1回の実行で処理する最大トピック数 */
const MAX_SOURCES_PER_RUN = 10
/** 1回の実行でキューから処理する最大 URL 数 */
const MAX_QUEUE_PER_RUN = 15

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

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

async function processQueueItem(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  apiKey: string,
  item: { id: string; source_id: string | null; topic: string; url: string; title: string | null },
  errors: string[]
): Promise<'created' | 'skipped'> {
  await supabase
    .from('hr_law_crawl_queue')
    .update({ status: 'processing' })
    .eq('id', item.id)

  try {
    if (!isAllowedUrl(item.url)) {
      await supabase
        .from('hr_law_crawl_queue')
        .update({
          status: 'skipped',
          processed_at: new Date().toISOString(),
          error_message: 'domain not allowed',
        })
        .eq('id', item.id)
      return 'skipped'
    }

    let bodyText = ''
    try {
      bodyText = await fetchPageText(apiKey, item.url)
    } catch {
      // フォールバック: 直接 fetch
      const pageRes = await fetch(item.url)
      if (pageRes.ok) {
        const html = await pageRes.text()
        bodyText = html
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }
    }

    if (bodyText.length < 100) {
      await supabase
        .from('hr_law_crawl_queue')
        .update({
          status: 'skipped',
          processed_at: new Date().toISOString(),
          error_message: 'body too short',
        })
        .eq('id', item.id)
      return 'skipped'
    }

    const contentHash = await sha256Hex(bodyText)
    const { data: existing } = await supabase
      .from('hr_law_documents')
      .select('id')
      .eq('content_hash', contentHash)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('hr_law_crawl_queue')
        .update({ status: 'done', processed_at: new Date().toISOString() })
        .eq('id', item.id)
      return 'skipped'
    }

    const summary = await summarizeLawArticle(
      apiKey,
      item.title || item.url,
      item.url,
      bodyText
    )
    if (!summary) {
      await supabase
        .from('hr_law_crawl_queue')
        .update({
          status: 'skipped',
          processed_at: new Date().toISOString(),
          error_message: 'unrelated or unsummarizable',
        })
        .eq('id', item.id)
      return 'skipped'
    }

    const today = new Date().toISOString().slice(0, 10)
    const status =
      summary.isExpired || (summary.expiresAt && summary.expiresAt < today)
        ? 'expired'
        : 'published'

    const { data: doc, error: docError } = await supabase
      .from('hr_law_documents')
      .insert({
        source_id: item.source_id,
        title: summary.title,
        source_url: item.url,
        content_hash: contentHash,
        summary: summary.summary,
        published_at: summary.publishedAt,
        expires_at: summary.expiresAt,
        theme: summary.theme,
        status,
      })
      .select('id, fetched_at')
      .single()

    if (docError || !doc) {
      errors.push(`${item.topic}: 文書登録失敗 ${docError?.message}`)
      await supabase
        .from('hr_law_crawl_queue')
        .update({
          status: 'skipped',
          processed_at: new Date().toISOString(),
          error_message: docError?.message ?? 'insert failed',
        })
        .eq('id', item.id)
      return 'skipped'
    }

    const chunks = chunkPlainText(summary.summary)
    if (chunks.length > 0) {
      try {
        const embeddings = await embedChunksBatch(apiKey, chunks)
        const chunkRows = chunks.map((content, i) => ({
          document_id: doc.id,
          chunk_index: i,
          content,
          embedding: formatVectorForPg(embeddings[i]),
          metadata: {
            document_title: summary.title,
            source_url: item.url,
            fetched_at: doc.fetched_at,
          },
        }))
        const { error: chunkError } = await supabase.from('hr_law_chunks').insert(chunkRows)
        if (chunkError) {
          errors.push(`${item.topic}: チャンク登録失敗 ${chunkError.message}`)
          await deleteOrphanedDocument(supabase, doc.id)
          await supabase
            .from('hr_law_crawl_queue')
            .update({
              status: 'skipped',
              processed_at: new Date().toISOString(),
              error_message: chunkError.message,
            })
            .eq('id', item.id)
          return 'skipped'
        }
      } catch (e) {
        errors.push(`${item.topic}: チャンク登録失敗 ${e instanceof Error ? e.message : String(e)}`)
        await deleteOrphanedDocument(supabase, doc.id)
        await supabase
          .from('hr_law_crawl_queue')
          .update({
            status: 'skipped',
            processed_at: new Date().toISOString(),
            error_message: e instanceof Error ? e.message : String(e),
          })
          .eq('id', item.id)
        return 'skipped'
      }
    }

    await supabase
      .from('hr_law_crawl_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', item.id)
    return 'created'
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    errors.push(`${item.topic}: ${msg}`)
    await supabase
      .from('hr_law_crawl_queue')
      .update({
        status: 'skipped',
        processed_at: new Date().toISOString(),
        error_message: msg,
      })
      .eq('id', item.id)
    return 'skipped'
  }
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') ?? ''

    if (!openRouterKey) {
      throw new Error('OPENROUTER_API_KEY が未設定です')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let body: { sourceId?: string } = {}
    try {
      body = await req.json()
    } catch {
      // cron からの空リクエストを許容
    }

    // 失効処理
    try {
      await supabase.rpc('expire_hr_law_documents')
    } catch (e) {
      console.error('[hr-law-refresh] expire_hr_law_documents', e)
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
    let queued = 0
    const errors: string[] = []

    // 1) トピック探索 → キューへ投入
    for (const source of sources ?? []) {
      try {
        const hits = await searchTopicUrls(
          openRouterKey,
          source.topic,
          source.search_query,
          RESULTS_PER_SOURCE
        )
        for (const hit of hits) {
          const { error: qErr } = await supabase.from('hr_law_crawl_queue').upsert(
            {
              source_id: source.id,
              topic: source.topic,
              url: hit.url,
              title: hit.title || null,
              priority: 100,
              status: 'pending',
            },
            { onConflict: 'url', ignoreDuplicates: true }
          )
          if (!qErr) queued++
        }
        await supabase
          .from('hr_law_sources')
          .update({ last_run_at: new Date().toISOString() })
          .eq('id', source.id)
      } catch (e) {
        errors.push(`${source.topic}: 検索失敗 ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    // 2) キューから上限件数を処理
    const { data: queueItems, error: queueError } = await supabase
      .from('hr_law_crawl_queue')
      .select('id, source_id, topic, url, title')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('discovered_at', { ascending: true })
      .limit(MAX_QUEUE_PER_RUN)

    if (queueError) throw queueError

    for (const item of queueItems ?? []) {
      const result = await processQueueItem(supabase, openRouterKey, item, errors)
      if (result === 'created') documentsCreated++
      else documentsSkipped++
    }

    return new Response(
      JSON.stringify({
        success: true,
        sourcesProcessed: (sources ?? []).length,
        queued,
        documentsCreated,
        documentsSkipped,
        queueRemainingHint: 'pending rows remain for next run if any',
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
