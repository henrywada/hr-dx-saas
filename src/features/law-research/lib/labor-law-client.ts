// labor-law-mcp のサービス層を直接 import する。
// このパッケージは package.json に exports マップを持たず files: ["dist/**/*"] で
// 全ファイルを同梱しているため、サブパス import が成立する。
// MCP プロトコル（stdio 子プロセス）は Vercel のサーバーレスで使えないため採用しない。
// 内部パス依存になるので package.json でバージョンを完全固定している（0.2.1）。
import { getLawArticle, getLawToc, searchLaw } from 'labor-law-mcp/dist/lib/services/law-service.js'
import {
  getMhlwTsutatsu,
  searchMhlwTsutatsu,
} from 'labor-law-mcp/dist/lib/services/mhlw-tsutatsu-service.js'
import {
  getJaishTsutatsu,
  searchJaishTsutatsu,
} from 'labor-law-mcp/dist/lib/services/jaish-tsutatsu-service.js'

import type { ResearchDocument, ResearchHit, ResearchResult } from '../types'
import { callExternal } from './external-call'
import {
  JAISH_BASE_URL,
  toJaishDocument,
  toJaishHits,
  toLawArticleDocument,
  toMhlwDocument,
  toMhlwHits,
  toSearchLawHits,
} from './normalize'

const EGOV_SITE = 'https://laws.e-gov.go.jp/'
const MHLW_SITE = 'https://www.mhlw.go.jp/hourei/'

/** 法令をキーワード検索する */
export function laborSearchLaw(keyword: string): Promise<ResearchResult<ResearchHit[]>> {
  return callExternal(
    '法令の検索結果',
    async () => toSearchLawHits(await searchLaw({ keyword, limit: 20 })),
    { sourceUrl: EGOV_SITE }
  )
}

/** 法令の特定条文を取得する */
export function laborGetLawArticle(
  lawName: string,
  article: string
): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${lawName} 第${article}条`,
    async () =>
      toLawArticleDocument(await getLawArticle({ lawName, article }), new Date().toISOString()),
    { sourceUrl: EGOV_SITE }
  )
}

/** 法令の目次を取得する */
export function laborGetLawToc(lawName: string): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${lawName} の目次`,
    async () => {
      const r = await getLawToc({ lawName })
      return {
        title: `${r.lawTitle} 目次`,
        identifier: '',
        body: r.toc,
        sourceUrl: r.egovUrl,
        fetchedAt: new Date().toISOString(),
      }
    },
    { sourceUrl: EGOV_SITE }
  )
}

/** 厚労省通達をキーワード検索する */
export function laborSearchMhlw(keyword: string): Promise<ResearchResult<ResearchHit[]>> {
  return callExternal(
    '厚労省通達の検索結果',
    async () => toMhlwHits(await searchMhlwTsutatsu({ keyword })),
    { sourceUrl: MHLW_SITE }
  )
}

/** 厚労省通達の本文を取得する */
export function laborGetMhlw(dataId: string): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    '厚労省通達の本文',
    async () => toMhlwDocument(await getMhlwTsutatsu({ dataId }), new Date().toISOString()),
    { sourceUrl: MHLW_SITE }
  )
}

/** 安衛通達（JAISH）をキーワード検索する */
export function laborSearchJaish(keyword: string): Promise<ResearchResult<ResearchHit[]>> {
  return callExternal(
    '安衛通達の検索結果',
    async () => toJaishHits(await searchJaishTsutatsu({ keyword, limit: 20 })),
    { sourceUrl: JAISH_BASE_URL }
  )
}

/** 安衛通達（JAISH）の本文を取得する */
export function laborGetJaish(url: string): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    '安衛通達の本文',
    async () => toJaishDocument(await getJaishTsutatsu({ url }), new Date().toISOString()),
    { sourceUrl: url }
  )
}
