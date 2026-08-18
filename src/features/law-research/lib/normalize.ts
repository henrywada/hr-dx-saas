import type { ResearchDocument, ResearchHit } from '../types'

/** JAISH（安全衛生情報センター）のベースURL。検索結果の url が相対パスで返るため補う */
export const JAISH_BASE_URL = 'https://www.jaish.gr.jp'

// --- 入力の構造型 ---------------------------------------------------------
// 外部パッケージの型に直接依存すると、パッケージ更新でテストまで壊れる。
// ここでは正規化に必要な最小限のフィールドだけを自前で定義する。

type SearchLawInput = {
  results: {
    lawTitle: string
    lawId: string
    lawNum: string
    lawType: string
    egovUrl: string
  }[]
}

type MhlwSearchInput = {
  results: { title: string; dataId: string; date: string; shubetsu: string }[]
}

type JaishSearchInput = {
  results: { title: string; number: string; date: string; url: string }[]
}

type SaiketsuSearchInput = {
  results: {
    collectionNo: number
    taxType: string
    category: string
    summary: string
    date: string
    caseUrl: string
  }[]
}

type LawArticleInput = {
  lawTitle: string
  article: string
  articleCaption: string
  text: string
  egovUrl: string
}

type MhlwDocumentInput = { title: string; body: string; dataId: string; url: string }

type JaishDocumentInput = { title: string; body: string; url: string }

type TaxTsutatsuInput = {
  tsutatsuName: string
  entry: { number: string; caption: string; body: string; url: string }
}

type SaiketsuFullTextInput = { fullText: { body: string; date: string; url: string } }

// --- URL 正規化 -----------------------------------------------------------

/** JAISH の相対パスを絶対URLへ変換する。既に絶対URLならそのまま返す */
export function resolveJaishUrl(url: string): string {
  if (!url) return JAISH_BASE_URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${JAISH_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

// --- 一覧（ResearchHit）---------------------------------------------------

/** e-Gov 法令検索の結果を一覧行へ写像する */
export function toSearchLawHits(input: SearchLawInput): ResearchHit[] {
  return input.results.map(r => ({
    id: r.lawId,
    title: r.lawTitle,
    identifier: r.lawNum,
    dateLabel: '',
    summary: '',
    ref: { kind: 'law_toc', lawName: r.lawTitle },
    sourceUrl: r.egovUrl,
  }))
}

/** 厚労省通達の検索結果を一覧行へ写像する */
export function toMhlwHits(input: MhlwSearchInput): ResearchHit[] {
  return input.results.map(r => ({
    id: r.dataId,
    title: r.title,
    identifier: r.shubetsu,
    dateLabel: r.date,
    summary: '',
    ref: { kind: 'mhlw_tsutatsu', dataId: r.dataId },
    sourceUrl: `https://www.mhlw.go.jp/web/t_doc?dataId=${encodeURIComponent(r.dataId)}`,
  }))
}

/** 安衛通達（JAISH）の検索結果を一覧行へ写像する */
export function toJaishHits(input: JaishSearchInput): ResearchHit[] {
  return input.results.map(r => {
    const absoluteUrl = resolveJaishUrl(r.url)
    return {
      id: absoluteUrl,
      title: r.title,
      identifier: r.number,
      dateLabel: r.date,
      summary: '',
      ref: { kind: 'jaish_tsutatsu', url: absoluteUrl },
      sourceUrl: absoluteUrl,
    }
  })
}

/** 裁決事例の検索結果を一覧行へ写像する */
export function toSaiketsuHits(input: SaiketsuSearchInput): ResearchHit[] {
  return input.results.map(r => ({
    id: r.caseUrl,
    title: r.category,
    identifier: `裁決事例集 第${r.collectionNo}集 ${r.taxType}`,
    dateLabel: r.date,
    summary: r.summary,
    ref: { kind: 'saiketsu', url: r.caseUrl },
    sourceUrl: r.caseUrl,
  }))
}

// --- 詳細（ResearchDocument）----------------------------------------------

/** 条文をドキュメントへ写像する。条見出しがあればタイトルに含める */
export function toLawArticleDocument(input: LawArticleInput, fetchedAt: string): ResearchDocument {
  const identifier = `第${input.article}条`
  const caption = input.articleCaption ? input.articleCaption : ''
  return {
    title: `${input.lawTitle} ${identifier}${caption}`,
    identifier,
    body: input.text,
    sourceUrl: input.egovUrl,
    fetchedAt,
  }
}

/** 厚労省通達本文をドキュメントへ写像する */
export function toMhlwDocument(input: MhlwDocumentInput, fetchedAt: string): ResearchDocument {
  return {
    title: input.title,
    identifier: input.dataId,
    body: input.body,
    sourceUrl: input.url,
    fetchedAt,
  }
}

/** 安衛通達本文をドキュメントへ写像する */
export function toJaishDocument(input: JaishDocumentInput, fetchedAt: string): ResearchDocument {
  return {
    title: input.title,
    identifier: '',
    body: input.body,
    sourceUrl: resolveJaishUrl(input.url),
    fetchedAt,
  }
}

/** 国税庁通達をドキュメントへ写像する */
export function toTaxTsutatsuDocument(
  input: TaxTsutatsuInput,
  fetchedAt: string
): ResearchDocument {
  return {
    title: `${input.tsutatsuName} ${input.entry.number} ${input.entry.caption}`.trim(),
    identifier: input.entry.number,
    body: input.entry.body,
    sourceUrl: input.entry.url,
    fetchedAt,
  }
}

/** 裁決事例の全文をドキュメントへ写像する */
export function toSaiketsuDocument(
  input: SaiketsuFullTextInput,
  fetchedAt: string
): ResearchDocument {
  return {
    title: `裁決事例（${input.fullText.date}）`,
    identifier: input.fullText.date,
    body: input.fullText.body,
    sourceUrl: input.fullText.url,
    fetchedAt,
  }
}
