import type { ResearchHit } from '../types'

/**
 * e-Gov 法令API v2 のベースURL。
 * hourei-mcp-server は v1（https://laws.e-gov.go.jp/api/1）を使っているが、
 * tax-law-mcp / labor-law-mcp が v2 を使うため、API 世代を v2 に統一する。
 */
export const EGOV_API_V2_BASE = 'https://laws.e-gov.go.jp/api/2'

/** e-Gov 法令ページのURLを law_id から組み立てる */
function egovLawUrl(lawId: string): string {
  return `https://laws.e-gov.go.jp/law/${lawId}`
}

type RevisionEntry = {
  law_revision_id?: string
  law_title?: string
  abbrev?: string
  amendment_promulgate_date?: string
  amendment_law_num?: string
}

type LawRevisionsResponse = {
  law_info?: { law_id?: string; law_num?: string; promulgation_date?: string }
  revisions?: RevisionEntry[]
}

/**
 * 法令の改正履歴を取得する。
 * 失敗時は例外を投げる。分類とユーザー向けメッセージ化は callExternal に任せる。
 */
export async function fetchLawRevisions(lawId: string): Promise<ResearchHit[]> {
  const res = await fetch(`${EGOV_API_V2_BASE}/law_revisions/${lawId}`, {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`e-Gov law_revisions が ${res.status} を返しました`)
  }

  const json = (await res.json()) as LawRevisionsResponse
  const revisions = json.revisions ?? []
  const sourceUrl = egovLawUrl(lawId)

  return revisions.map((r, i) => {
    const title = r.law_title ?? ''
    return {
      id: r.law_revision_id ?? `${lawId}-${i}`,
      title,
      identifier: r.amendment_law_num ?? '',
      dateLabel: r.amendment_promulgate_date ?? '',
      summary: r.abbrev ? `略称: ${r.abbrev}` : '',
      ref: { kind: 'law_toc', lawName: title },
      sourceUrl,
    }
  })
}
