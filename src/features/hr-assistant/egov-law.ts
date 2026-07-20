/**
 * 質問文中の明示的な条文言及（例:「労基法第32条」）を検出し、
 * e-Gov 法令API v2 から条文原文を取得してチャット用コンテキストに整形する。
 *
 * RAG（hr_law_chunks）・オンデマンドWeb検索（ondemand-law.ts）を補完する経路。
 * 条文番号が明示された質問は、意味的類似検索より原文一致の方が正確なため、
 * RAGの類似度に関わらず常に試行する。
 */

import { detectLawArticleReferences } from './egov-law-detect'
import type { DetectedLawArticleRef } from './egov-law-detect'
import { fetchArticleData, getEgovUrl } from './egov-client'
import { extractArticleFromNode, extractLawTitle } from './egov-parser'
import type { Citation } from './types'

export type EgovLawArticleResult = {
  contextBlocks: string[]
  citations: Citation[]
}

type FetchedArticle = { contextBlock: string; citation: Citation }

/**
 * "9_2" → "第9条の2"、"24_2_3" → "第24条の2の3"（多段枝番号）、"32" → "第32条"
 * のように条・項・号を表示用に整形する
 */
export function formatArticleLabel(article: string, paragraph?: number, item?: number): string {
  const [main, ...branches] = article.split('_')
  const articlePart = branches.length > 0 ? `第${main}条の${branches.join('の')}` : `第${main}条`
  const paragraphPart = paragraph ? `第${paragraph}項` : ''
  const itemPart = item ? `第${item}号` : ''
  return `${articlePart}${paragraphPart}${itemPart}`
}

async function fetchOneArticle(
  ref: DetectedLawArticleRef,
  today: string
): Promise<FetchedArticle | null> {
  try {
    const data = await fetchArticleData(ref.lawId, ref.article)
    if (!data) return null

    const extracted = extractArticleFromNode(
      data.law_full_text,
      ref.article,
      ref.paragraph,
      ref.item
    )
    if (!extracted || !extracted.text) return null

    const lawTitle = extractLawTitle(data) || ref.lawName
    const egovUrl = getEgovUrl(ref.lawId)
    const articleLabel = formatArticleLabel(ref.article, ref.paragraph, ref.item)

    return {
      // articleCaption には e-Gov 側で既に全角括弧が付与されている（例: 「（安全衛生教育）」）
      contextBlock: `【法令原文（e-Gov）: ${lawTitle} ${articleLabel}${extracted.articleCaption}（取得日: ${today}、出典: ${egovUrl}）】\n${extracted.text}`,
      citation: {
        title: `${lawTitle} ${articleLabel}`,
        snippet: extracted.text.slice(0, 200) + (extracted.text.length > 200 ? '…' : ''),
        sourceUrl: egovUrl,
        fetchedAt: today,
      },
    }
  } catch (e) {
    console.error('[egov-law] fetch article', ref.lawName, ref.article, e)
    return null
  }
}

/**
 * 質問文から条文参照を検出して e-Gov 原文を取得する。
 * 複数参照がある場合は並行取得する（e-Gov 側の遅延・タイムアウトが積み上がって
 * チャット応答全体をブロックしないようにするため）。
 * 参照が無い、または全件取得に失敗した場合は null（チャットは他の経路で継続）。
 */
export async function fetchLawArticleContext(
  question: string
): Promise<EgovLawArticleResult | null> {
  const refs = detectLawArticleReferences(question)
  if (refs.length === 0) return null

  const today = new Date().toISOString().slice(0, 10)
  const results = await Promise.all(refs.map(ref => fetchOneArticle(ref, today)))
  const fetched = results.filter((r): r is FetchedArticle => r !== null)

  if (fetched.length === 0) return null
  return {
    contextBlocks: fetched.map(f => f.contextBlock),
    citations: fetched.map(f => f.citation),
  }
}
