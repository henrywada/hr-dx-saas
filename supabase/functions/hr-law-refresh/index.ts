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
import { runFreshnessChecks } from './freshness.ts'
import { discoverMhlwTopicProposals } from './proposals.ts'

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
): Promise<{ status: 'created' | 'skipped'; detailChars: number }> {
  await supabase.from('hr_law_crawl_queue').update({ status: 'processing' }).eq('id', item.id)

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
      return { status: 'skipped', detailChars: 0 }
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
      return { status: 'skipped', detailChars: 0 }
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
      return { status: 'skipped', detailChars: 0 }
    }

    const summary = await summarizeLawArticle(apiKey, item.title || item.url, item.url, bodyText)
    if (!summary) {
      await supabase
        .from('hr_law_crawl_queue')
        .update({
          status: 'skipped',
          processed_at: new Date().toISOString(),
          error_message: 'unrelated or unsummarizable',
        })
        .eq('id', item.id)
      return { status: 'skipped', detailChars: 0 }
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
        detail: summary.detail,
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
      return { status: 'skipped', detailChars: 0 }
    }

    const chunks = chunkPlainText(summary.detail)
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
          return { status: 'skipped', detailChars: 0 }
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
        return { status: 'skipped', detailChars: 0 }
      }
    }

    await supabase
      .from('hr_law_crawl_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', item.id)
    return { status: 'created', detailChars: summary.detail.length }
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
    return { status: 'skipped', detailChars: 0 }
  }
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startedAt = new Date().toISOString()
  let logId: string | null = null
  // deno-lint-ignore no-explicit-any
  let supabase: any = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')['default'] ?? ''
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') ?? ''

    if (!openRouterKey) {
      throw new Error('OPENROUTER_API_KEY が未設定です')
    }

    supabase = createClient(supabaseUrl, serviceRoleKey)

    let body: { sourceId?: string; trigger?: string } = {}
    try {
      body = await req.json()
    } catch {
      // cron からの空リクエストを許容
    }

    const triggerType = body.trigger === 'manual' || body.sourceId ? 'manual' : 'cron'

    // 実施ログ開始行
    {
      const { data: logRow } = await supabase
        .from('hr_law_refresh_logs')
        .insert({
          started_at: startedAt,
          trigger_type: triggerType,
          source_id: body.sourceId ?? null,
          success: true,
        })
        .select('id')
        .single()
      logId = logRow?.id ?? null
    }

    // 失効処理
    try {
      await supabase.rpc('expire_hr_law_documents')
    } catch (e) {
      console.error('[hr-law-refresh] expire_hr_law_documents', e)
    }

    let freshnessChecked = 0
    let documentsUpdated = 0
    let proposalsCreated = 0

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

    const sourceTopic = body.sourceId && sources?.length === 1 ? (sources[0].topic as string) : null

    let documentsCreated = 0
    let documentsSkipped = 0
    let queued = 0
    const errors: string[] = []

    // 0) 週次のみ: 既存文書の鮮度チェック
    if (!body.sourceId) {
      try {
        const fr = await runFreshnessChecks(supabase, openRouterKey)
        freshnessChecked = fr.checked
        documentsUpdated = fr.updated
        errors.push(...fr.errors)
      } catch (e) {
        errors.push(`鮮度チェック失敗: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

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
          // 既存URLでも pending に戻す（文書削除後の再収集・手動再実行のため）
          const { error: qErr } = await supabase.from('hr_law_crawl_queue').upsert(
            {
              source_id: source.id,
              topic: source.topic,
              url: hit.url,
              title: hit.title || null,
              priority: 100,
              status: 'pending',
              processed_at: null,
              error_message: null,
            },
            { onConflict: 'url' }
          )
          if (!qErr) queued++
          else errors.push(`${source.topic}: キュー登録失敗 ${qErr.message}`)
        }
        if (hits.length === 0) {
          errors.push(`${source.topic}: 検索ヒット0件（OpenRouter web_search 結果なし）`)
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

    let detailChars = 0
    for (const item of queueItems ?? []) {
      const result = await processQueueItem(supabase, openRouterKey, item, errors)
      if (result.status === 'created') {
        documentsCreated++
        detailChars += result.detailChars
      } else {
        documentsSkipped++
      }
    }

    // 3) 週次のみ: 厚労省新着からトピック候補
    if (!body.sourceId) {
      try {
        const pr = await discoverMhlwTopicProposals(supabase, openRouterKey)
        proposalsCreated = pr.created
        errors.push(...pr.errors)
      } catch (e) {
        errors.push(`新着提案失敗: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    const sourcesProcessed = (sources ?? []).length
    // 例外なしでも「何も処理していない」場合は詳細に理由を残す
    if (documentsCreated === 0 && documentsSkipped === 0 && queued === 0 && errors.length === 0) {
      errors.push(
        '処理対象なし: 新規キュー追加0・未処理キュー0。検索結果が空か、再投入に失敗しています。'
      )
    }
    if (logId) {
      await supabase
        .from('hr_law_refresh_logs')
        .update({
          finished_at: new Date().toISOString(),
          source_topic: sourceTopic,
          sources_processed: sourcesProcessed,
          queued,
          documents_created: documentsCreated,
          documents_skipped: documentsSkipped,
          detail_chars: detailChars,
          freshness_checked: freshnessChecked,
          documents_updated: documentsUpdated,
          proposals_created: proposalsCreated,
          success: true,
          errors,
        })
        .eq('id', logId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        sourcesProcessed,
        queued,
        documentsCreated,
        documentsSkipped,
        detailChars,
        freshnessChecked,
        documentsUpdated,
        proposalsCreated,
        queueRemainingHint: 'pending rows remain for next run if any',
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error(err)
    const msg = String(err)
    if (supabase && logId) {
      try {
        await supabase
          .from('hr_law_refresh_logs')
          .update({
            finished_at: new Date().toISOString(),
            success: false,
            error_message: msg,
          })
          .eq('id', logId)
      } catch (logErr) {
        console.error('[hr-law-refresh] log update failed', logErr)
      }
    } else if (supabase) {
      try {
        await supabase.from('hr_law_refresh_logs').insert({
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          trigger_type: 'cron',
          success: false,
          error_message: msg,
        })
      } catch (logErr) {
        console.error('[hr-law-refresh] log insert failed', logErr)
      }
    }
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
