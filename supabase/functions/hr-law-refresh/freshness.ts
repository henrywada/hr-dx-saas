import { chunkPlainText } from './chunk.ts'
import {
  fetchPageText,
  summarizeLawArticle,
  embedChunksBatch,
  formatVectorForPg,
  isAllowedUrl,
} from './openrouter.ts'

const MAX_FRESHNESS_PER_RUN = 30

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function fetchHttpValidators(url: string): Promise<{
  etag: string | null
  lastModified: string | null
}> {
  try {
    const head = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (head.ok) {
      return {
        etag: head.headers.get('etag'),
        lastModified: head.headers.get('last-modified'),
      }
    }
  } catch {
    // GET へフォールバック
  }
  try {
    const get = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { Range: 'bytes=0-0' },
    })
    return {
      etag: get.headers.get('etag'),
      lastModified: get.headers.get('last-modified'),
    }
  } catch {
    return { etag: null, lastModified: null }
  }
}

export type FreshnessResult = {
  checked: number
  updated: number
  errors: string[]
}

/** 公開中文書のハイブリッド鮮度チェック（ETag/LM → hash → 変化時のみ再要約） */
export async function runFreshnessChecks(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  apiKey: string
): Promise<FreshnessResult> {
  const errors: string[] = []
  let checked = 0
  let updated = 0

  const { data: docs, error } = await supabase
    .from('hr_law_documents')
    .select(
      'id, title, source_url, content_hash, http_etag, http_last_modified, summary, detail, theme, published_at, expires_at, status'
    )
    .eq('status', 'published')
    .order('content_checked_at', { ascending: true, nullsFirst: true })
    .limit(MAX_FRESHNESS_PER_RUN)

  if (error) {
    errors.push(`鮮度対象取得失敗: ${error.message}`)
    return { checked, updated, errors }
  }

  const now = new Date().toISOString()

  for (const doc of docs ?? []) {
    checked++
    const url = doc.source_url as string
    if (!isAllowedUrl(url)) {
      await supabase
        .from('hr_law_documents')
        .update({ content_checked_at: now })
        .eq('id', doc.id)
      continue
    }

    try {
      const validators = await fetchHttpValidators(url)
      const etagSame =
        validators.etag &&
        doc.http_etag &&
        validators.etag === doc.http_etag
      const lmSame =
        validators.lastModified &&
        doc.http_last_modified &&
        validators.lastModified === doc.http_last_modified

      if (etagSame || lmSame) {
        await supabase
          .from('hr_law_documents')
          .update({
            content_checked_at: now,
            http_etag: validators.etag ?? doc.http_etag,
            http_last_modified: validators.lastModified ?? doc.http_last_modified,
          })
          .eq('id', doc.id)
        continue
      }

      let bodyText = ''
      try {
        bodyText = await fetchPageText(apiKey, url)
      } catch {
        const pageRes = await fetch(url)
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
          .from('hr_law_documents')
          .update({
            content_checked_at: now,
            http_etag: validators.etag,
            http_last_modified: validators.lastModified,
          })
          .eq('id', doc.id)
        continue
      }

      const contentHash = await sha256Hex(bodyText)
      if (contentHash === doc.content_hash) {
        await supabase
          .from('hr_law_documents')
          .update({
            content_checked_at: now,
            http_etag: validators.etag,
            http_last_modified: validators.lastModified,
          })
          .eq('id', doc.id)
        continue
      }

      // 他文書と hash 衝突する場合は更新せずスキップ
      const { data: conflict } = await supabase
        .from('hr_law_documents')
        .select('id')
        .eq('content_hash', contentHash)
        .neq('id', doc.id)
        .maybeSingle()
      if (conflict) {
        errors.push(`${doc.title}: content_hash 衝突のため更新スキップ`)
        await supabase
          .from('hr_law_documents')
          .update({ content_checked_at: now })
          .eq('id', doc.id)
        continue
      }

      const summary = await summarizeLawArticle(apiKey, doc.title, url, bodyText)
      if (!summary) {
        errors.push(`${doc.title}: 再要約不可（旧文書を維持）`)
        await supabase
          .from('hr_law_documents')
          .update({ content_checked_at: now })
          .eq('id', doc.id)
        continue
      }

      const today = new Date().toISOString().slice(0, 10)
      const status =
        summary.isExpired || (summary.expiresAt && summary.expiresAt < today)
          ? 'expired'
          : 'published'

      const { error: updErr } = await supabase
        .from('hr_law_documents')
        .update({
          title: summary.title,
          content_hash: contentHash,
          summary: summary.summary,
          detail: summary.detail,
          theme: summary.theme,
          published_at: summary.publishedAt,
          expires_at: summary.expiresAt,
          status,
          fetched_at: now,
          content_checked_at: now,
          http_etag: validators.etag,
          http_last_modified: validators.lastModified,
        })
        .eq('id', doc.id)

      if (updErr) {
        errors.push(`${doc.title}: 文書更新失敗 ${updErr.message}`)
        continue
      }

      const chunks = chunkPlainText(summary.detail)
      await supabase.from('hr_law_chunks').delete().eq('document_id', doc.id)
      if (chunks.length > 0) {
        const embeddings = await embedChunksBatch(apiKey, chunks)
        const chunkRows = chunks.map((content, i) => ({
          document_id: doc.id,
          chunk_index: i,
          content,
          embedding: formatVectorForPg(embeddings[i]),
          metadata: {
            document_title: summary.title,
            source_url: url,
            fetched_at: now,
          },
        }))
        const { error: chunkError } = await supabase.from('hr_law_chunks').insert(chunkRows)
        if (chunkError) {
          errors.push(`${doc.title}: チャンク差し替え失敗 ${chunkError.message}`)
          continue
        }
      }
      updated++
    } catch (e) {
      errors.push(
        `${doc.title}: 鮮度チェック失敗 ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }

  return { checked, updated, errors }
}
