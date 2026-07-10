'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { RefreshActionResult } from './types'
import { normalizeSeoTopicKey, rankSeoKeywords } from './seo-keyword-rank'

async function getSaasAdminUser() {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) return null
  return user
}

/** 文書を無効化/再公開する（status のトグル） */
export async function toggleHrLawDocumentStatus(
  documentId: string,
  nextStatus: 'published' | 'disabled'
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('hr_law_documents')
    .update({ status: nextStatus })
    .eq('id', documentId)

  if (error) {
    console.error('[saas-law-knowledge] toggleHrLawDocumentStatus', error)
    return { ok: false, error: '更新に失敗しました' }
  }

  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** 指定トピックの法令ナレッジ収集を手動実行する（Edge Function を直接呼び出す） */
export async function triggerHrLawRefresh(sourceId: string): Promise<RefreshActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: 'Supabase の接続情報が未設定です' }
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/hr-law-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sourceId, trigger: 'manual' }),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      return { ok: false, error: data.error ?? `実行に失敗しました (${res.status})` }
    }

    revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
    return {
      ok: true,
      documentsCreated: data.documentsCreated ?? 0,
      documentsSkipped: data.documentsSkipped ?? 0,
      errors: data.errors ?? [],
      queued: data.queued ?? 0,
    }
  } catch (e) {
    console.error('[saas-law-knowledge] triggerHrLawRefresh', e)
    return { ok: false, error: '実行リクエストに失敗しました' }
  }
}

/** 収集文書を物理削除する（チャンクは CASCADE） */
export async function deleteHrLawDocument(
  documentId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }
  if (!documentId) return { ok: false, error: '文書IDが不正です' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('hr_law_documents').delete().eq('id', documentId)

  if (error) {
    console.error('[saas-law-knowledge] deleteHrLawDocument', error)
    return { ok: false, error: '削除に失敗しました' }
  }

  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** 実施ログを1件削除する */
export async function deleteHrLawRefreshLog(
  logId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }
  if (!logId) return { ok: false, error: 'ログIDが不正です' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('hr_law_refresh_logs').delete().eq('id', logId)

  if (error) {
    console.error('[saas-law-knowledge] deleteHrLawRefreshLog', error)
    return { ok: false, error: '削除に失敗しました' }
  }

  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** 実施ログをすべて削除する */
export async function deleteAllHrLawRefreshLogs(): Promise<{
  ok: boolean
  error?: string
}> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const supabase = createAdminClient()
  // 全件削除（id が null でない行 = 全行）
  const { error } = await supabase.from('hr_law_refresh_logs').delete().not('id', 'is', null)

  if (error) {
    console.error('[saas-law-knowledge] deleteAllHrLawRefreshLogs', error)
    return { ok: false, error: '一括削除に失敗しました' }
  }

  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** SEOキー分析の実行結果 */
export type SeoAnalyzeResult =
  | {
      ok: true
      topCount: number
      added: number
      skipped: number
      keywords: string[]
    }
  | { ok: false; error: string }

/** SEOキー分析の固定シード語 */
const SEO_SEED_QUERIES = ['人事', '労務', '労働基準法', '働き方改革', '社会保険'] as const

/** SerpAPI から related_searches / related_questions を取得する */
async function fetchRelatedTermsFromSerp(seed: string, apiKey: string): Promise<string[]> {
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google')
  url.searchParams.set('q', seed)
  url.searchParams.set('hl', 'ja')
  url.searchParams.set('gl', 'jp')
  url.searchParams.set('api_key', apiKey)

  const res = await fetch(url.toString(), { method: 'GET' })
  if (!res.ok) {
    throw new Error(`SerpAPI HTTP ${res.status}`)
  }

  const data = await res.json()
  if (data.error) {
    throw new Error(String(data.error))
  }

  const terms: string[] = []
  for (const item of data.related_searches ?? []) {
    if (item?.query) terms.push(String(item.query))
  }
  for (const item of data.related_questions ?? []) {
    if (item?.question) {
      // 疑問文の末尾句読点を除去してキーワード化
      const q = String(item.question)
        .replace(/[？?。．.！!]+$/g, '')
        .trim()
      if (q) terms.push(q)
    }
  }
  return terms
}

/** SerpAPI で SEO 近似キーワード TOP10 を取得し、未登録のみ候補へ追加する */
export async function analyzeSeoKeywordsForTopicProposals(): Promise<SeoAnalyzeResult> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const apiKey = (process.env.SERPAPI_API_KEY ?? '').trim()
  if (!apiKey) return { ok: false, error: 'SERPAPI_API_KEY が未設定です' }

  const allTerms: string[] = []
  let successCount = 0
  for (const seed of SEO_SEED_QUERIES) {
    try {
      const terms = await fetchRelatedTermsFromSerp(seed, apiKey)
      allTerms.push(...terms)
      successCount++
    } catch (e) {
      console.error('[saas-law-knowledge] fetchRelatedTermsFromSerp', seed, e)
    }
  }
  if (successCount === 0) {
    return { ok: false, error: 'SerpAPI からキーワードを取得できませんでした' }
  }

  const seedKeys = new Set(SEO_SEED_QUERIES.map(s => normalizeSeoTopicKey(s)))
  const ranked = rankSeoKeywords(allTerms, { seedKeys, limit: 10 })
  if (ranked.length === 0) {
    return { ok: false, error: 'SEO 関連キーワードが見つかりませんでした' }
  }

  const supabase = createAdminClient()

  const { data: sources, error: sErr } = await supabase
    .from('hr_law_sources')
    .select('topic')
    .eq('enabled', true)
    .limit(500)
  if (sErr) {
    console.error('[saas-law-knowledge] analyzeSeo fetch sources', sErr)
    return { ok: false, error: '監視トピックの取得に失敗しました' }
  }
  const enabledKeys = new Set(
    (sources ?? []).map((s: { topic: string }) => normalizeSeoTopicKey(s.topic))
  )

  const { data: pending, error: pErr } = await supabase
    .from('hr_law_topic_proposals')
    .select('topic_key')
    .eq('status', 'pending')
    .limit(500)
  if (pErr) {
    console.error('[saas-law-knowledge] analyzeSeo fetch pending', pErr)
    return { ok: false, error: '候補一覧の取得に失敗しました' }
  }
  const pendingKeys = new Set((pending ?? []).map((p: { topic_key: string }) => p.topic_key))

  let added = 0
  let skipped = 0
  const collectedAt = new Date().toISOString()

  for (const kw of ranked) {
    if (enabledKeys.has(kw.topicKey) || pendingKeys.has(kw.topicKey)) {
      skipped++
      continue
    }

    const { error } = await supabase.from('hr_law_topic_proposals').insert({
      topic: kw.topic,
      topic_key: kw.topicKey,
      search_query: kw.topic,
      source: 'seo',
      score: kw.hitCount,
      status: 'pending',
      evidence: {
        seeds: [...SEO_SEED_QUERIES],
        rank: kw.rank,
        hit_count: kw.hitCount,
        collected_at: collectedAt,
      },
    })
    if (error) {
      console.error('[saas-law-knowledge] analyzeSeo insert', error)
      return { ok: false, error: '候補の追加に失敗しました' }
    }
    added++
    pendingKeys.add(kw.topicKey)
  }

  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return {
    ok: true,
    topCount: ranked.length,
    added,
    skipped,
    keywords: ranked.map(k => k.topic),
  }
}

/** 監視トピックを手動追加 */
export async function createHrLawSource(input: {
  topic: string
  searchQuery: string
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const topic = (input.topic ?? '').trim()
  const searchQuery = (input.searchQuery ?? '').trim()
  if (!topic || !searchQuery) return { ok: false, error: 'トピック名と検索クエリは必須です' }

  const supabase = createAdminClient()
  const key = normalizeSeoTopicKey(topic)

  const { data: existing } = await supabase
    .from('hr_law_sources')
    .select('id, enabled, topic')
    .limit(200)

  const dup = (existing ?? []).find((s: { topic: string }) => normalizeSeoTopicKey(s.topic) === key)
  if (dup) {
    if (dup.enabled) return { ok: false, error: '同名の有効トピックが既にあります' }
    const { error } = await supabase
      .from('hr_law_sources')
      .update({
        enabled: true,
        disabled_at: null,
        search_query: searchQuery,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dup.id)
    if (error) return { ok: false, error: '再有効化に失敗しました' }
    revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
    return { ok: true }
  }

  const { error } = await supabase.from('hr_law_sources').insert({
    topic,
    search_query: searchQuery,
    enabled: true,
    origin: 'manual',
  })
  if (error) {
    console.error('[saas-law-knowledge] createHrLawSource', error)
    return { ok: false, error: '追加に失敗しました' }
  }
  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** 監視トピックを論理削除（無効化） */
export async function disableHrLawSource(
  sourceId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }
  if (!sourceId) return { ok: false, error: 'IDが不正です' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('hr_law_sources')
    .update({
      enabled: false,
      disabled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)

  if (error) {
    console.error('[saas-law-knowledge] disableHrLawSource', error)
    return { ok: false, error: '無効化に失敗しました' }
  }
  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** 監視トピックを再有効化 */
export async function enableHrLawSource(
  sourceId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }
  if (!sourceId) return { ok: false, error: 'IDが不正です' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('hr_law_sources')
    .update({
      enabled: true,
      disabled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)

  if (error) {
    console.error('[saas-law-knowledge] enableHrLawSource', error)
    return { ok: false, error: '再有効化に失敗しました' }
  }
  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/**
 * 監視トピックを物理削除する。
 * 収集済み文書・チャンクは残す（source_id は ON DELETE SET NULL）。
 */
export async function deleteHrLawSource(
  sourceId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }
  if (!sourceId) return { ok: false, error: 'IDが不正です' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('hr_law_sources').delete().eq('id', sourceId)

  if (error) {
    console.error('[saas-law-knowledge] deleteHrLawSource', error)
    return { ok: false, error: '物理削除に失敗しました' }
  }
  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** トピック候補を承認して hr_law_sources へ反映 */
export async function approveHrLawTopicProposal(
  proposalId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }
  if (!proposalId) return { ok: false, error: 'IDが不正です' }

  const supabase = createAdminClient()
  const { data: proposal, error: pErr } = await supabase
    .from('hr_law_topic_proposals')
    .select('id, topic, topic_key, search_query, status')
    .eq('id', proposalId)
    .single()

  if (pErr || !proposal) return { ok: false, error: '候補が見つかりません' }
  if (proposal.status !== 'pending') return { ok: false, error: '既に処理済みです' }

  const { data: sources } = await supabase
    .from('hr_law_sources')
    .select('id, topic, enabled')
    .limit(300)

  const match = (sources ?? []).find(
    (s: { topic: string }) => normalizeSeoTopicKey(s.topic) === proposal.topic_key
  )

  let sourceId: string | null = null
  if (match) {
    if (match.enabled) return { ok: false, error: '同名の有効トピックが既にあります' }
    const { error } = await supabase
      .from('hr_law_sources')
      .update({
        enabled: true,
        disabled_at: null,
        search_query: proposal.search_query,
        updated_at: new Date().toISOString(),
      })
      .eq('id', match.id)
    if (error) return { ok: false, error: '再有効化に失敗しました' }
    sourceId = match.id
  } else {
    const { data: inserted, error } = await supabase
      .from('hr_law_sources')
      .insert({
        topic: proposal.topic,
        search_query: proposal.search_query,
        enabled: true,
        origin: 'proposal',
      })
      .select('id')
      .single()
    if (error || !inserted) {
      console.error('[saas-law-knowledge] approve insert', error)
      return { ok: false, error: 'トピック作成に失敗しました' }
    }
    sourceId = inserted.id
  }

  const { error: uErr } = await supabase
    .from('hr_law_topic_proposals')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      created_source_id: sourceId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposalId)

  if (uErr) {
    console.error('[saas-law-knowledge] approve proposal', uErr)
    return { ok: false, error: '候補の更新に失敗しました' }
  }

  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** トピック候補を却下 */
export async function rejectHrLawTopicProposal(
  proposalId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }
  if (!proposalId) return { ok: false, error: 'IDが不正です' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('hr_law_topic_proposals')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', proposalId)
    .eq('status', 'pending')

  if (error) {
    console.error('[saas-law-knowledge] rejectHrLawTopicProposal', error)
    return { ok: false, error: '却下に失敗しました' }
  }
  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}
