// tax-law-mcp のサービス層を直接 import する。理由は labor-law-client.ts のコメント参照。
// バージョンは package.json で完全固定している（0.5.4）。
import { getLawArticle } from 'tax-law-mcp/dist/lib/services/law-service.js'
import { getTsutatsu, listTsutatsuToc } from 'tax-law-mcp/dist/lib/services/tsutatsu-service.js'
import { getSaiketsu, searchSaiketsu } from 'tax-law-mcp/dist/lib/services/saiketsu-service.js'

import type { ResearchDocument, ResearchHit, ResearchResult } from '../types'
import { callExternal } from './external-call'
import {
  toLawArticleDocument,
  toSaiketsuDocument,
  toSaiketsuHits,
  toTaxTsutatsuDocument,
} from './normalize'

const EGOV_SITE = 'https://laws.e-gov.go.jp/'
const NTA_SITE = 'https://www.nta.go.jp/law/tsutatsu/kihon/'
const KFS_SITE = 'https://www.kfs.go.jp/service/'

/** 税法の特定条文を取得する */
export function taxGetLawArticle(
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

/** 国税庁通達の目次を取得する */
export function taxListTsutatsuToc(
  tsutatsuName: string
): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${tsutatsuName} の目次`,
    async () => {
      const r = await listTsutatsuToc({ tsutatsuName })
      return {
        title: `${r.tsutatsuName} 目次`,
        identifier: '',
        body: r.tocText,
        sourceUrl: r.tocUrl,
        fetchedAt: new Date().toISOString(),
      }
    },
    { sourceUrl: NTA_SITE }
  )
}

/** 国税庁通達の特定エントリを取得する */
export function taxGetTsutatsu(
  tsutatsuName: string,
  num: string
): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    `${tsutatsuName} ${num}`,
    async () =>
      toTaxTsutatsuDocument(
        await getTsutatsu({ tsutatsuName, number: num }),
        new Date().toISOString()
      ),
    { sourceUrl: NTA_SITE }
  )
}

/** 裁決事例をキーワード検索する */
export function taxSearchSaiketsu(keyword: string): Promise<ResearchResult<ResearchHit[]>> {
  return callExternal(
    '裁決事例の検索結果',
    async () => toSaiketsuHits(await searchSaiketsu({ keyword, limit: 20 })),
    { sourceUrl: KFS_SITE }
  )
}

/** 裁決事例の全文を取得する */
export function taxGetSaiketsu(url: string): Promise<ResearchResult<ResearchDocument>> {
  return callExternal(
    '裁決事例の全文',
    async () => toSaiketsuDocument(await getSaiketsu({ url }), new Date().toISOString()),
    { sourceUrl: url }
  )
}
