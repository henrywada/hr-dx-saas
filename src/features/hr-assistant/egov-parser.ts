/**
 * e-Gov 法令API v2 のレスポンス（elm絞り込み時、law_full_text = 対象条文ノード）から
 * 条文テキストを抽出する。
 * 出典: labor-law-mcp (https://github.com/kentaroajisaka/labor-law-mcp, MIT License) を
 * elm絞り込み前提（law_full_text が Article ノード直下）に合わせて簡略移植。
 */

import type { EgovLawData, EgovNode } from './egov-types'

/** 全角数字を半角に変換する */
function toHalfWidthDigits(input: string): string {
  return input.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30))
}

/**
 * 条文番号を正規化する（e-Gov の elm パラメータ・Num属性と同じ表記に揃える）
 * "33" → "33", "33の2" → "33_2", "第33条" → "33", "第33条の2" → "33_2",
 * "24条の2の3" → "24_2_3"（多段の枝番号）, "33-2" → "33_2", 全角数字 → 半角
 */
export function normalizeArticleNum(input: string): string {
  const trimmed = toHalfWidthDigits(input.trim()).replace(/^第/, '')

  // "33条の2" / "24条の2の3" のように「条」の後ろに枝番号（多段可）が続く形式を優先的に解釈する
  const withArticleSuffix = trimmed.match(/^(\d+)条((?:の\d+)*)/)
  if (withArticleSuffix && withArticleSuffix[2]) {
    const branches = withArticleSuffix[2].match(/\d+/g) ?? []
    return [withArticleSuffix[1], ...branches].join('_')
  }

  let num = trimmed.replace(/条.*$/, '')
  num = num.replace(/の/g, '_').replace(/-/g, '_')
  return num
}

/** ノードからテキストのみを再帰的に抽出する（ルビ(Rt)タグは除外） */
function getText(node: EgovNode | null | undefined): string {
  if (!node?.children) return ''
  const parts: string[] = []
  for (const child of node.children) {
    if (typeof child === 'string') {
      parts.push(child)
    } else if (child.tag === 'Rt') {
      continue
    } else {
      parts.push(getText(child))
    }
  }
  return parts.join('')
}

function findChild(node: EgovNode, tag: string): EgovNode | undefined {
  return node.children?.find((c): c is EgovNode => typeof c !== 'string' && c.tag === tag)
}

function findChildByNum(node: EgovNode, tag: string, num: number): EgovNode | undefined {
  return node.children?.find(
    (c): c is EgovNode => typeof c !== 'string' && c.tag === tag && Number(c.attr?.Num) === num
  )
}

/**
 * "Subitem1" のような号の細分ノードのタグ名か判定する。
 * "Subitem1Title" / "Subitem1Sentence" は startsWith('Subitem') が真になってしまうため、
 * 末尾が数字のみの完全一致で判定する（誤って自分自身のTitle/Sentenceを子として辿らないため）。
 */
function isSubitemTag(tag: string): boolean {
  return /^Subitem\d+$/.test(tag)
}

/**
 * 号の細分（Subitem1, Subitem2, ...）を再帰的にテキスト化する。
 * e-Gov は深さに応じて "Subitem1"→"Subitem2"→... と動的にタグ名が変わる。
 */
function parseSubitem(node: EgovNode, indentLevel: number): string[] {
  const indent = '  '.repeat(indentLevel)
  const titleTag = `${node.tag}Title`
  const sentenceTag = `${node.tag}Sentence`
  const title = getText(findChild(node, titleTag))
  const sentence = getText(findChild(node, sentenceTag))
  const lines = [`${indent}${[title, sentence].filter(Boolean).join(' ').trim()}`]

  const deeper = (node.children ?? []).filter(
    (c): c is EgovNode => typeof c !== 'string' && isSubitemTag(c.tag)
  )
  for (const child of deeper) {
    lines.push(...parseSubitem(child, indentLevel + 1))
  }
  return lines
}

/** 号（Item）1件をテキスト化する（Subitem がある場合は再帰的に展開する） */
function parseItem(item: EgovNode): string {
  const title = getText(findChild(item, 'ItemTitle'))
  const sentence = getText(findChild(item, 'ItemSentence'))
  const lines = [[title, sentence].filter(Boolean).join(' ').trim()]

  const subitems = (item.children ?? []).filter(
    (c): c is EgovNode => typeof c !== 'string' && isSubitemTag(c.tag)
  )
  for (const sub of subitems) {
    lines.push(...parseSubitem(sub, 1))
  }
  return lines.join('\n')
}

/** 項（Paragraph）1件をテキスト化する */
function parseParagraph(paragraph: EgovNode): string {
  const num = getText(findChild(paragraph, 'ParagraphNum'))
  const sentence = getText(findChild(paragraph, 'ParagraphSentence'))
  const lines = [[num, sentence].filter(Boolean).join(' ').trim()].filter(Boolean)

  const items = (paragraph.children ?? []).filter(
    (c): c is EgovNode => typeof c !== 'string' && c.tag === 'Item'
  )
  for (const it of items) {
    lines.push(`  ${parseItem(it)}`)
  }
  return lines.join('\n')
}

/** 条文（Article）全体をテキスト化する */
function parseArticle(article: EgovNode): string {
  const paragraphs = (article.children ?? []).filter(
    (c): c is EgovNode => typeof c !== 'string' && c.tag === 'Paragraph'
  )
  return paragraphs.map(parseParagraph).join('\n')
}

export type ExtractedArticle = {
  text: string
  articleCaption: string
}

/**
 * elm絞り込みで取得した条文ノード（law_full_text）から本文を抽出する。
 * ノードが Article でない、または条番号が一致しない場合は null。
 */
export function extractArticleFromNode(
  articleNode: EgovNode,
  articleNum: string,
  paragraph?: number,
  item?: number
): ExtractedArticle | null {
  if (articleNode.tag !== 'Article') return null

  const normalized = normalizeArticleNum(articleNum)
  const actualNum = articleNode.attr?.Num
  if (actualNum !== normalized) return null

  const caption = getText(findChild(articleNode, 'ArticleCaption'))

  if (paragraph !== undefined) {
    const paraNode = findChildByNum(articleNode, 'Paragraph', paragraph)
    if (!paraNode) return null

    if (item !== undefined) {
      const itemNode = findChildByNum(paraNode, 'Item', item)
      if (!itemNode) return null
      return { text: parseItem(itemNode), articleCaption: caption }
    }
    return { text: parseParagraph(paraNode), articleCaption: caption }
  }

  return { text: parseArticle(articleNode), articleCaption: caption }
}

/** 法令タイトルを取得する（revision_info優先、無ければcurrent_revision_info） */
export function extractLawTitle(data: EgovLawData): string {
  return data.revision_info?.law_title ?? data.current_revision_info?.law_title ?? ''
}
