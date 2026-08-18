'use server'

import { openRouterChat, OPENROUTER_SUMMARIZE_MODEL } from '@/lib/ai/openrouter'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'

import { fetchLawRevisions } from './lib/egov-revision'
import { callExternal } from './lib/external-call'
import {
  laborGetJaish,
  laborGetLawArticle,
  laborGetLawToc,
  laborGetMhlw,
  laborSearchJaish,
  laborSearchLaw,
  laborSearchMhlw,
} from './lib/labor-law-client'
import {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  SUMMARY_MAX_TOKENS,
} from './lib/summarize-prompt'
import {
  taxGetSaiketsu,
  taxGetTsutatsu,
  taxListTsutatsuToc,
  taxSearchSaiketsu,
} from './lib/tax-law-client'
import type {
  ResearchDocument,
  ResearchHit,
  ResearchMode,
  ResearchRef,
  ResearchResult,
  ResearchSubTab,
} from './types'

/** 未ログイン時に返す共通エラー */
const UNAUTHORIZED: ResearchResult<never> = {
  ok: false,
  error: { kind: 'invalid_input', message: 'ログイン情報が無効です。再度ログインしてください。' },
}

const EGOV_SITE = 'https://laws.e-gov.go.jp/'
const NTA_SITE = 'https://www.nta.go.jp/law/tsutatsu/kihon/'

/**
 * 検索履歴を記録する。
 * 履歴の記録失敗で検索結果そのものを失わせないため、失敗してもログのみ残して続行する。
 */
async function recordHistory(input: {
  tenantId: string
  employeeId: string | null
  mode: ResearchMode
  subTab: ResearchSubTab
  keyword: string
  resultCount: number
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('tenant_research_queries').insert({
    tenant_id: input.tenantId,
    employee_id: input.employeeId,
    mode: input.mode,
    sub_tab: input.subTab,
    keyword: input.keyword,
    result_count: input.resultCount,
  })

  if (error) console.error('[law-research] recordHistory', error)
}

/**
 * 条文・通達の「直接指定」を一覧1件として返す。
 * 検索ではなく指定なのでここでは外部通信せず、詳細取得（fetchResearchDocument）へ繋ぐ。
 */
function directHit(input: {
  id: string
  title: string
  identifier: string
  ref: ResearchRef
  sourceUrl: string
}): ResearchResult<ResearchHit[]> {
  return {
    ok: true,
    data: [
      {
        id: input.id,
        title: input.title,
        identifier: input.identifier,
        dateLabel: '',
        summary: '',
        ref: input.ref,
        sourceUrl: input.sourceUrl,
      },
    ],
  }
}

/** サブタブごとの検索を実行する */
async function dispatchSearch(input: {
  subTab: ResearchSubTab
  keyword: string
  article?: string
}): Promise<ResearchResult<ResearchHit[]>> {
  const { subTab, keyword, article } = input

  switch (subTab) {
    // --- キーワード検索（外部通信あり）---
    case 'labor_mhlw':
      return laborSearchMhlw(keyword)
    case 'labor_jaish':
      return laborSearchJaish(keyword)
    case 'law_search':
      return laborSearchLaw(keyword)
    case 'tax_saiketsu':
      return taxSearchSaiketsu(keyword)
    case 'law_revision':
      return callExternal('改正履歴', () => fetchLawRevisions(keyword), { sourceUrl: EGOV_SITE })

    // --- 直接指定（外部通信は詳細取得で行う）---
    // 条文取得は e-Gov v2 を叩く点で税法・労務法・法令モードとも同一のため、
    // ref は共通の law_article / law_toc に寄せる（DRY）
    case 'tax_article':
    case 'labor_article':
    case 'law_article':
      return directHit({
        id: `${subTab}-${keyword}-${article ?? ''}`,
        title: article ? `${keyword} 第${article}条` : `${keyword} 目次`,
        identifier: article ? `第${article}条` : '',
        ref: article
          ? { kind: 'law_article', lawName: keyword, article }
          : { kind: 'law_toc', lawName: keyword },
        sourceUrl: EGOV_SITE,
      })

    // 通達番号を知らないユーザーが大半なので、番号未入力なら目次を返して辿れるようにする
    case 'tax_tsutatsu':
      return directHit({
        id: `${keyword}-${article ?? 'toc'}`,
        title: article ? `${keyword} ${article}` : `${keyword} 目次`,
        identifier: article ?? '',
        ref: article
          ? { kind: 'tax_tsutatsu', tsutatsuName: keyword, number: article }
          : { kind: 'tax_tsutatsu_toc', tsutatsuName: keyword },
        sourceUrl: NTA_SITE,
      })

    default:
      return {
        ok: false,
        error: { kind: 'invalid_input', message: '不正な検索対象が指定されました。' },
      }
  }
}

/**
 * 検索を実行し、履歴を記録する。
 * 外部サイトへの通信はすべてこの Server Action の中で行う。
 */
export async function runResearchSearch(input: {
  mode: ResearchMode
  subTab: ResearchSubTab
  keyword: string
  article?: string
}): Promise<ResearchResult<ResearchHit[]>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return UNAUTHORIZED

  const keyword = input.keyword?.trim()
  if (!keyword) {
    return {
      ok: false,
      error: { kind: 'invalid_input', message: '検索キーワードを入力してください。' },
    }
  }

  const result = await dispatchSearch({
    subTab: input.subTab,
    keyword,
    article: input.article?.trim() || undefined,
  })

  await recordHistory({
    tenantId: user.tenant_id,
    employeeId: user.employee_id ?? null,
    mode: input.mode,
    subTab: input.subTab,
    keyword,
    resultCount: result.ok ? result.data.length : 0,
  })

  return result
}

/** 一覧行から原文全文を取得する */
export async function fetchResearchDocument(
  ref: ResearchRef
): Promise<ResearchResult<ResearchDocument>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return UNAUTHORIZED

  switch (ref.kind) {
    case 'law_article':
      return laborGetLawArticle(ref.lawName, ref.article)
    case 'law_toc':
      return laborGetLawToc(ref.lawName)
    case 'mhlw_tsutatsu':
      return laborGetMhlw(ref.dataId)
    case 'jaish_tsutatsu':
      return laborGetJaish(ref.url)
    case 'tax_tsutatsu':
      return taxGetTsutatsu(ref.tsutatsuName, ref.number)
    case 'tax_tsutatsu_toc':
      return taxListTsutatsuToc(ref.tsutatsuName)
    case 'saiketsu':
      return taxGetSaiketsu(ref.url)
    default:
      return {
        ok: false,
        error: { kind: 'invalid_input', message: '不正な取得対象が指定されました。' },
      }
  }
}

/**
 * 取得済み原文の要約を生成する。
 *
 * 入力は「画面上で実際に取得した原文」のみ。モデルに検索させず、RAG も引かない。
 * ユーザーが明示的に要約ボタンを押したときだけ呼ばれる（自動実行しない）。
 */
export async function summarizeResearchDocument(
  doc: ResearchDocument
): Promise<ResearchResult<string>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return UNAUTHORIZED

  if (!process.env.OPENROUTER_API_KEY) {
    return {
      ok: false,
      error: { kind: 'invalid_input', message: 'OPENROUTER_API_KEY が未設定です。' },
    }
  }

  if (!doc?.body?.trim()) {
    return {
      ok: false,
      error: { kind: 'invalid_input', message: '要約する原文がありません。' },
    }
  }

  return callExternal('AI要約', async () => {
    const res = await openRouterChat({
      model: OPENROUTER_SUMMARIZE_MODEL,
      messages: [
        { role: 'system', content: buildSummarySystemPrompt() },
        { role: 'user', content: buildSummaryUserPrompt(doc) },
      ],
      temperature: 0.1,
      maxTokens: SUMMARY_MAX_TOKENS,
      // Gemini 2.5 系の thinking が出力予算を食い潰し、要約が途中終了するのを防ぐ
      reasoning: { exclude: true },
    })
    return res.content
  })
}
