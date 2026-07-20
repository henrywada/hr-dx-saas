/**
 * ユーザーの質問文から「法令名（略称含む）+ 条文番号」の明示的な言及を検出する。
 * 条文番号を伴わない法令名の言及（一般的な質問）は誤爆防止のため検出しない。
 */

import { LAW_ALIAS_MAP, LAW_ID_MAP, resolveLawName } from './egov-law-registry'
import { normalizeArticleNum } from './egov-parser'

export type DetectedLawArticleRef = {
  lawName: string
  lawId: string
  article: string
  paragraph?: number
  item?: number
}

/** 1回の質問から検出する条文参照の上限（コスト・レイテンシ抑制） */
const MAX_REFERENCES = 3

/**
 * 法令名の直後に続く「条文番号（＋項・号）」パターン。
 * 法令名と条文番号の間の空白・読点（例:「労働基準法 第32条」）は許容する。
 * 枝番号は多段（例: "24条の2の3"）にも対応する。
 * 例: "第32条", "36条", "9条の2", "24条の2の3", "第36条第1項第2号"
 */
const ARTICLE_SUFFIX_RE = /^[\s、。]{0,2}(?:の)?第?(\d+)条((?:の\d+)*)(?:第(\d+)項)?(?:第(\d+)号)?/

/** 走査対象の文字数（法令名直後の接続語・条文表記に十分な長さ） */
const LOOKAHEAD_CHARS = 20

let cachedNames: string[] | null = null

/** レジストリ登録済みの法令名・略称を、長い順に並べて返す（部分一致の誤検出を避けるため） */
function allKnownLawNames(): string[] {
  if (cachedNames) return cachedNames
  const names = new Set([...Object.keys(LAW_ID_MAP), ...Object.keys(LAW_ALIAS_MAP)])
  cachedNames = [...names].sort((a, b) => b.length - a.length)
  return cachedNames
}

export function detectLawArticleReferences(question: string): DetectedLawArticleRef[] {
  const results: DetectedLawArticleRef[] = []
  const seenKeys = new Set<string>()

  for (const name of allKnownLawNames()) {
    let searchFrom = 0
    for (;;) {
      if (results.length >= MAX_REFERENCES) return results

      const idx = question.indexOf(name, searchFrom)
      if (idx === -1) break
      searchFrom = idx + name.length

      const rest = question.slice(searchFrom, searchFrom + LOOKAHEAD_CHARS)
      const match = rest.match(ARTICLE_SUFFIX_RE)
      if (!match) continue

      const { name: lawName, lawId } = resolveLawName(name)
      if (!lawId) continue

      const mainNum = normalizeArticleNum(match[1])
      const branches = match[2].match(/\d+/g) ?? []
      const article = branches.length > 0 ? [mainNum, ...branches].join('_') : mainNum
      const paragraph = match[3] ? Number(match[3]) : undefined
      const item = match[4] ? Number(match[4]) : undefined

      const key = `${lawId}:${article}:${paragraph ?? ''}:${item ?? ''}`
      if (seenKeys.has(key)) continue
      seenKeys.add(key)

      results.push({ lawName, lawId, article, paragraph, item })
    }
  }

  return results
}
