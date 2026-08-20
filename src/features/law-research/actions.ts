'use server'

import { APP_ROUTES } from '@/config/routes'
import { openRouterChat, OPENROUTER_SUMMARIZE_MODEL } from '@/lib/ai/openrouter'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import {
  extractKeywordCandidates,
  extractLawTitleKeywords,
  extractSearchKeyword,
} from './lib/extract-keyword'
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
import { mergeSearchResults } from './lib/merge-search-results'
import {
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  SUMMARY_MAX_TOKENS,
} from './lib/summarize-prompt'
import {
  taxGetLawArticle,
  taxGetLawToc,
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

/** 履歴テーブルの sub_tab は互換のため残す。検索自体はモード単位で行う */
const HISTORY_SUB_TAB: Record<ResearchMode, ResearchSubTab> = {
  tax: 'tax_saiketsu',
  labor: 'labor_mhlw',
  law: 'law_search',
}

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
  article: string | null
  resultCount: number
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('tenant_research_queries').insert({
    tenant_id: input.tenantId,
    employee_id: input.employeeId,
    mode: input.mode,
    sub_tab: input.subTab,
    keyword: input.keyword,
    article: input.article,
    result_count: input.resultCount,
  })

  if (error) console.error('[law-research] recordHistory', error)
}

/**
 * モード単位で原文を検索する。
 * 人事・経営者は資料の種別を選ばないため、労務は通達と法令をまとめて引く。
 */
async function searchByMode(
  mode: ResearchMode,
  keyword: string
): Promise<ResearchResult<ResearchHit[]>> {
  const q = extractKeywordCandidates(keyword)[0] || extractSearchKeyword(keyword)

  switch (mode) {
    case 'tax':
      return taxSearchSaiketsu(q)
    case 'labor': {
      const titleKeywords = extractLawTitleKeywords(keyword)
      const [mhlw, jaish, ...laws] = await Promise.all([
        laborSearchMhlw(q),
        laborSearchJaish(q),
        ...titleKeywords.map(k => laborSearchLaw(k)),
      ])
      return mergeSearchResults([mhlw, jaish, ...laws])
    }
    case 'law': {
      const titleKeywords = extractLawTitleKeywords(keyword)
      const results = await Promise.all(titleKeywords.map(k => laborSearchLaw(k)))
      return mergeSearchResults(results)
    }
  }
}

/**
 * 検索を実行し、履歴を記録する。
 * 外部サイトへの通信はすべてこの Server Action の中で行う。
 */
export async function runResearchSearch(input: {
  mode: ResearchMode
  keyword: string
}): Promise<ResearchResult<ResearchHit[]>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return UNAUTHORIZED

  const keyword = input.keyword?.trim()
  if (!keyword) {
    return {
      ok: false,
      error: { kind: 'invalid_input', message: '調べたいことを入力してください。' },
    }
  }

  const result = await searchByMode(input.mode, keyword)

  await recordHistory({
    tenantId: user.tenant_id,
    employeeId: user.employee_id ?? null,
    mode: input.mode,
    subTab: HISTORY_SUB_TAB[input.mode],
    keyword,
    article: null,
    resultCount: result.ok ? result.data.length : 0,
  })

  return result
}

/**
 * 検索履歴を1件削除する。
 * 対象は必ず id と tenant_id の両方で絞る（範囲無指定の DELETE は禁止）。
 */
export async function deleteResearchHistory(id: string): Promise<ResearchResult<{ id: string }>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return UNAUTHORIZED

  const historyId = id?.trim()
  if (!historyId) {
    return {
      ok: false,
      error: { kind: 'invalid_input', message: '削除する履歴が指定されていません。' },
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenant_research_queries')
    .delete()
    .eq('id', historyId)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('[law-research] deleteResearchHistory', error)
    return {
      ok: false,
      error: { kind: 'upstream', message: '検索履歴を削除できませんでした。' },
    }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_RESEARCH)
  return { ok: true, data: { id: historyId } }
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
    case 'tax_law_article':
      return taxGetLawArticle(ref.lawName, ref.article)
    case 'tax_law_toc':
      return taxGetLawToc(ref.lawName)
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
