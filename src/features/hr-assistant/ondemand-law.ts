import { createAdminClient } from '@/lib/supabase/admin'
// 全テナント共有の公的法令 KB（tenant_id なし）への書き込み専用。
// テナント固有データには使わない。RLS 上 authenticated の INSERT が無いため admin が必要。
import {
  openRouterChat,
  openRouterWebSearchChat,
  OPENROUTER_SUMMARIZE_MODEL,
  HR_LAW_ALLOWED_DOMAINS,
} from '@/lib/ai/openrouter'
import type { Citation } from './types'
// チャンク分割は共通実装を使う。以前ここに独自複製を持っていたが、
// 末尾でオーバーラップ計算が破綻し重複チャンクを量産するバグを抱えていた。
import { chunkPlainText } from '../inquiry-chat/chunk'
// 埋め込みは Gemini に統一（hr_law_chunks は検索時も Gemini で埋め込むため空間を揃える）
import { embedChunks, formatVectorForPg } from '../inquiry-chat/embedding'

/** オンデマンド収集の上限 URL 数 */
const MAX_ONDEMAND_URLS = 2

const THEME_OPTIONS = [
  '賃金',
  '社会保険',
  'ストレスチェック',
  'ハラスメント',
  '育児介護',
  '労働時間',
  '安全衛生',
  '障害者雇用',
  'その他',
] as const

export type OnDemandLawResult = {
  contextBlocks: string[]
  citations: Citation[]
  citedIds: string[]
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function isAllowedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return HR_LAW_ALLOWED_DOMAINS.some(d => host === d || host.endsWith(`.${d}`))
  } catch {
    return false
  }
}

type StructuredDoc = {
  title: string
  summary: string
  detail: string
  sourceUrl: string
  theme: string
  publishedAt: string | null
  expiresAt: string | null
  isExpired: boolean
}

/**
 * 法令 RAG が弱いとき、厚労省系を探索して KB に追加し、回答用コンテキストを返す。
 * 失敗時は null（チャットは一般回答で継続）。
 */
export async function fetchAndStoreLawOnMiss(question: string): Promise<OnDemandLawResult | null> {
  // 法令・制度系でなければスキップ（コスト抑制）
  const looksLikeLaw =
    /法令|法律|通達|最低賃金|社会保険|育児|介護|ハラスメント|ストレスチェック|労基|労働基準|36協定|時間外|有給|解雇|雇止め|安全衛生|障害者雇用|厚労|厚生労働省/.test(
      question
    )
  if (!looksLikeLaw) return null

  const search = await openRouterWebSearchChat({
    system:
      'あなたは日本の人事労務の調査アシスタントです。' +
      'ユーザーの質問に関連する厚生労働省等の公式情報だけを検索し、' +
      '見つかった公式ページのタイトル・URL・要点を JSON で返してください。' +
      '出力形式: {"items":[{"title":string,"url":string,"snippet":string}]}' +
      '関連が無い場合は {"items":[]}。推測で埋めないこと。',
    user: question,
    maxResults: MAX_ONDEMAND_URLS,
  })

  let items: { title?: string; url?: string; snippet?: string }[] = []
  try {
    const jsonMatch = search.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { items?: typeof items }
      items = parsed.items ?? []
    }
  } catch {
    // annotations から URL を拾う
    items = (search.annotations ?? [])
      .filter(a => a.url)
      .slice(0, MAX_ONDEMAND_URLS)
      .map(a => ({ title: a.title, url: a.url, snippet: a.content }))
  }

  const urls = items
    .map(i => i.url)
    .filter((u): u is string => !!u && isAllowedUrl(u))
    .slice(0, MAX_ONDEMAND_URLS)

  if (urls.length === 0) return null

  const summarize = await openRouterChat({
    model: OPENROUTER_SUMMARIZE_MODEL,
    json: true,
    temperature: 0.1,
    maxTokens: 2000,
    messages: [
      {
        role: 'system',
        content:
          '人事担当者向けに公式情報を整理する。次の JSON 配列のみ返す: ' +
          '[{"title":string,"summary":string,"detail":string,"sourceUrl":string,"theme":string,' +
          '"publishedAt":"YYYY-MM-DD"|null,"expiresAt":"YYYY-MM-DD"|null,"isExpired":boolean}]。' +
          'summary は一覧用2〜3文。detail は800〜2000字程度で、施行日・対象・実務対応・数値を含め、' +
          '情報元URLを開かなくても足り、AI回答の根拠になる量にする。推測禁止。' +
          `theme は次のいずれか: ${THEME_OPTIONS.join(', ')}。` +
          '不確かな場合は空配列 []。',
      },
      {
        role: 'user',
        content:
          `質問: ${question}\n\n検索結果:\n` +
          items
            .filter(i => i.url && urls.includes(i.url))
            .map(i => `- ${i.title}\n  URL: ${i.url}\n  ${i.snippet ?? ''}`)
            .join('\n'),
      },
    ],
  })

  let docs: StructuredDoc[] = []
  try {
    const parsed = JSON.parse(summarize.content) as StructuredDoc[] | { docs?: StructuredDoc[] }
    docs = Array.isArray(parsed) ? parsed : (parsed.docs ?? [])
  } catch {
    return null
  }

  docs = docs
    .filter(d => d.summary && d.sourceUrl && isAllowedUrl(d.sourceUrl))
    .map(d => ({ ...d, detail: (d.detail && d.detail.trim()) || d.summary }))
    .slice(0, MAX_ONDEMAND_URLS)
  if (docs.length === 0) return null

  const supabase = createAdminClient()
  const contextBlocks: string[] = []
  const citations: Citation[] = []
  const citedIds: string[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const doc of docs) {
    // 重複判定は source_url で行う。
    // 以前は content_hash = sha256(sourceUrl + summary) で判定していたが、summary は
    // LLM 生成のため同じURLでも実行ごとに揺れ、UNIQUE(content_hash) をすり抜けて
    // 同一URLの文書が際限なく増えていた。URL は安定しており、週次ジョブ側が登録した
    // 文書（content_hash は本文ハッシュ）とも突き合わせられる。
    // 旧バグで同一URLの文書が既に複数存在しうるため、maybeSingle() ではなく
    // 先頭1件を取る（maybeSingle は複数行でエラーになる）。
    const { data: existingRows } = await supabase
      .from('hr_law_documents')
      .select('id, title, summary, source_url, fetched_at, status')
      .eq('source_url', doc.sourceUrl)
      .order('fetched_at', { ascending: false })
      .limit(1)

    const existing = existingRows?.[0]

    // 新規登録時の content_hash も URL 由来にして安定させる（列は NOT NULL / UNIQUE）
    const contentHash = await sha256Hex(doc.sourceUrl)

    let documentId = existing?.id as string | undefined
    let fetchedAt = (existing?.fetched_at as string | undefined) ?? new Date().toISOString()
    const status =
      doc.isExpired || (doc.expiresAt && doc.expiresAt < today) ? 'expired' : 'published'

    if (!documentId) {
      const { data: inserted, error } = await supabase
        .from('hr_law_documents')
        .insert({
          title: doc.title,
          source_url: doc.sourceUrl,
          content_hash: contentHash,
          summary: doc.summary,
          detail: doc.detail,
          published_at: doc.publishedAt,
          expires_at: doc.expiresAt,
          theme: doc.theme || 'その他',
          status,
        })
        .select('id, fetched_at')
        .single()

      if (error || !inserted) {
        console.error('[ondemand-law] insert doc', error)
        // 重複以外はコンテキストだけ使う
        contextBlocks.push(
          `【法令情報（オンデマンド）: ${doc.title}（出典: ${doc.sourceUrl}）】\n${doc.detail}`
        )
        citations.push({
          title: doc.title,
          snippet: doc.summary.slice(0, 200),
          sourceUrl: doc.sourceUrl,
          fetchedAt: today,
        })
        continue
      }
      documentId = inserted.id
      fetchedAt = inserted.fetched_at

      const chunks = chunkPlainText(doc.detail)
      if (chunks.length > 0) {
        try {
          const embeddings = await embedChunks(chunks)
          const chunkRows = chunks.map((content, i) => ({
            document_id: documentId,
            chunk_index: i,
            content,
            embedding: formatVectorForPg(embeddings[i]),
            metadata: {
              document_title: doc.title,
              source_url: doc.sourceUrl,
              fetched_at: fetchedAt,
            },
          }))
          const { data: chunkData, error: chunkError } = await supabase
            .from('hr_law_chunks')
            .insert(chunkRows)
            .select('id')
          if (chunkError) {
            console.error('[ondemand-law] insert chunks', chunkError)
          } else {
            citedIds.push(...(chunkData ?? []).map((c: { id: string }) => c.id))
          }
        } catch (e) {
          console.error('[ondemand-law] embed', e)
        }
      }
    }

    contextBlocks.push(
      `【法令情報: ${doc.title}（取得日: ${fetchedAt.slice(0, 10)}、出典: ${doc.sourceUrl}）】\n${doc.detail}`
    )
    citations.push({
      title: doc.title,
      snippet: doc.summary.slice(0, 200) + (doc.summary.length > 200 ? '…' : ''),
      sourceUrl: doc.sourceUrl,
      fetchedAt: fetchedAt.slice(0, 10),
    })
  }

  if (contextBlocks.length === 0) return null
  return { contextBlocks, citations, citedIds }
}
