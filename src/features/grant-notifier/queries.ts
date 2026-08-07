import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import type { DeliverableGrant, Verdict } from '@/features/grant-notifier/types'
import { buildDigest } from '@/features/grant-notifier/batch/deliver/digest'
import { APP_ROUTES } from '@/config/routes'
import {
  aggregateLlmCost,
  buildTenantOps,
  detectAnomalies,
  summarizeBatchRuns,
  type BatchSummary,
  type LlmCostSummary,
  type TenantOpsRow,
} from '@/features/grant-notifier/dashboard-aggregate'

/**
 * 助成金情報配信の読み取り（SELECT）専用。
 * テナント向けは RLS が効くサーバークライアントを使い、テナント分離を DB 側で強制する。
 * SaaS 管理者向けの全テナント横断集計だけは createAdminClient() を使い、
 * 呼び出し前に developer 権限を必ず確認する。
 */

// ---------------------------------------------------------------------------
// テナント管理者向け
// ---------------------------------------------------------------------------

export interface GrantConditionView {
  industries: string[]
  employeeCount: number | null
  capital: number | null
  prefectures: string[]
  categories: string[]
  keywords: string
  notifyEmails: string[]
  deliveryFrequency: 'weekly' | 'monthly'
}

const EMPTY_CONDITION: GrantConditionView = {
  industries: [],
  employeeCount: null,
  capital: null,
  prefectures: [],
  categories: [],
  keywords: '',
  notifyEmails: [],
  deliveryFrequency: 'weekly',
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/** 自テナントの配信条件。未設定なら null */
export async function getGrantConditions(): Promise<GrantConditionView | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grant_tenant_conditions')
    .select(
      'industries, employee_count, capital, prefectures, categories, keywords, notify_emails, delivery_frequency'
    )
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (error) {
    console.error('[grant-notifier] 配信条件の取得に失敗しました:', error.message)
    return null
  }
  if (!data) return null

  return {
    ...EMPTY_CONDITION,
    industries: toStringArray(data.industries),
    employeeCount: data.employee_count,
    capital: data.capital,
    prefectures: toStringArray(data.prefectures),
    categories: toStringArray(data.categories),
    keywords: data.keywords ?? '',
    notifyEmails: toStringArray(data.notify_emails),
    deliveryFrequency: data.delivery_frequency === 'monthly' ? 'monthly' : 'weekly',
  }
}

export interface GrantNotifierOverview {
  hasConditions: boolean
  /** 配信済みメール（送信バッチ）の通数 */
  deliveryBatchCount: number
  /** 配信された助成金の延べ件数 */
  deliveredGrantCount: number
  fitCount: number
  reviewCount: number
  lastDeliveryAt: string | null
}

/** ホーム画面用の概況 */
export async function getGrantNotifierOverview(): Promise<GrantNotifierOverview> {
  const empty: GrantNotifierOverview = {
    hasConditions: false,
    deliveryBatchCount: 0,
    deliveredGrantCount: 0,
    fitCount: 0,
    reviewCount: 0,
    lastDeliveryAt: null,
  }

  const user = await getServerUser()
  if (!user?.tenant_id) return empty

  const supabase = await createClient()
  const [conditionRes, deliveriesRes, matchesRes] = await Promise.all([
    supabase
      .from('grant_tenant_conditions')
      .select('tenant_id')
      .eq('tenant_id', user.tenant_id)
      .maybeSingle(),
    supabase
      .from('grant_deliveries')
      .select('sent_at')
      .eq('tenant_id', user.tenant_id)
      .order('sent_at', { ascending: false }),
    supabase
      .from('grant_match_results')
      .select('verdict')
      .eq('tenant_id', user.tenant_id)
      .in('verdict', ['適合', '要確認']),
  ])

  const deliveries = deliveriesRes.data ?? []
  const matches = matchesRes.data ?? []

  return {
    hasConditions: Boolean(conditionRes.data),
    // 同一 sent_at の行は1通のメールに対応する
    deliveryBatchCount: new Set(deliveries.map(d => d.sent_at)).size,
    deliveredGrantCount: deliveries.length,
    fitCount: matches.filter(m => m.verdict === '適合').length,
    reviewCount: matches.filter(m => m.verdict === '要確認').length,
    lastDeliveryAt: deliveries[0]?.sent_at ?? null,
  }
}

export interface DeliveryBatchView {
  sentAt: string
  subject: string
  /** 一覧に出す「メールメッセージのまとめ」 */
  summary: string
  grantCount: number
  /** 実際に送ったメール本文（HTML）。モーダルで原文を表示する */
  html: string
}

interface ArchiveGrantRow {
  id: string
  title: string
  summary: string | null
  issuer: string | null
  target_area: string | null
  target_employees: string | null
  max_amount: number | null
  subsidy_rate: string | null
  acceptance_end_at: string | null
  external_url: string | null
  fetched_at: string
}

/**
 * 配信アーカイブ一覧。実際に送信したメール（送信バッチ）単位でまとめる。
 * 配信時と同じ buildDigest でメール本文を再生成するため、送信済み HTML を保存しなくてよい。
 */
export async function getDeliveryArchive(): Promise<DeliveryBatchView[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const [deliveriesRes, matchesRes] = await Promise.all([
    supabase
      .from('grant_deliveries')
      .select(
        'sent_at, grants(id, title, summary, issuer, target_area, target_employees, max_amount, subsidy_rate, acceptance_end_at, external_url, fetched_at)'
      )
      .eq('tenant_id', user.tenant_id)
      .order('sent_at', { ascending: false }),
    supabase
      .from('grant_match_results')
      .select('grant_id, verdict, reasons')
      .eq('tenant_id', user.tenant_id),
  ])

  if (deliveriesRes.error) {
    console.error(
      '[grant-notifier] 配信アーカイブの取得に失敗しました:',
      deliveriesRes.error.message
    )
    return []
  }

  const matchByGrantId = new Map<string, { verdict: Verdict; reasons: string[] }>()
  for (const row of matchesRes.data ?? []) {
    matchByGrantId.set(row.grant_id, {
      verdict: row.verdict as Verdict,
      reasons: toStringArray(row.reasons),
    })
  }

  // 同一 sent_at（= 同一送信バッチ）ごとにまとめる
  const grouped = new Map<string, ArchiveGrantRow[]>()
  for (const row of deliveriesRes.data ?? []) {
    const grant = row.grants as ArchiveGrantRow | null
    if (!grant) continue
    const list = grouped.get(row.sent_at) ?? []
    list.push(grant)
    grouped.set(row.sent_at, list)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const conditionsUrl = `${baseUrl}${APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_CONDITIONS}`
  const archiveUrl = `${baseUrl}${APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_ARCHIVE}`
  // アーカイブ表示は特定の受信者向けではないため、配信停止リンクは条件設定画面へ誘導する
  const unsubscribeUrl = conditionsUrl

  return Array.from(grouped.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([sentAt, grants]) => {
      const deliverables: DeliverableGrant[] = grants.map(g => {
        const match = matchByGrantId.get(g.id)
        return {
          grantId: g.id,
          title: g.title,
          summary: g.summary,
          issuer: g.issuer,
          targetArea: g.target_area,
          targetEmployees: g.target_employees,
          maxAmount: g.max_amount,
          subsidyRate: g.subsidy_rate,
          acceptanceEndAt: g.acceptance_end_at,
          externalUrl: g.external_url ?? '',
          fetchedAt: g.fetched_at,
          verdict: match?.verdict ?? '要確認',
          reasons: match?.reasons ?? [],
        }
      })

      const digest = buildDigest({
        grants: deliverables,
        unsubscribeUrl,
        conditionsUrl,
        archiveUrl,
      })

      return {
        sentAt,
        subject: digest.subject,
        summary: grants.map((g, i) => `${i + 1}. ${g.title}`).join('\n'),
        grantCount: grants.length,
        html: digest.html,
      }
    })
}

export interface GrantDetailView {
  verdict: Verdict
  confidence: number
  reasons: string[]
  unclearPoints: string[]
  grant: {
    id: string
    title: string
    summary: string | null
    detailText: string | null
    issuer: string | null
    targetArea: string | null
    targetEmployees: string | null
    maxAmount: number | null
    subsidyRate: string | null
    acceptanceStartAt: string | null
    acceptanceEndAt: string | null
    externalUrl: string | null
    fetchedAt: string
  }
}

interface DetailGrantRow {
  id: string
  title: string
  summary: string | null
  detail_text: string | null
  issuer: string | null
  target_area: string | null
  target_employees: string | null
  max_amount: number | null
  subsidy_rate: string | null
  acceptance_start_at: string | null
  acceptance_end_at: string | null
  external_url: string | null
  fetched_at: string
}

/** 助成金1件の判定理由と詳細。自テナントの判定が無ければ null（RLS でも二重に守られる） */
export async function getGrantDetail(grantId: string): Promise<GrantDetailView | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('grant_match_results')
    .select(
      'verdict, confidence, reasons, unclear_points, grants(id, title, summary, detail_text, issuer, target_area, target_employees, max_amount, subsidy_rate, acceptance_start_at, acceptance_end_at, external_url, fetched_at)'
    )
    .eq('tenant_id', user.tenant_id)
    .eq('grant_id', grantId)
    .maybeSingle()

  if (error) {
    console.error('[grant-notifier] 助成金詳細の取得に失敗しました:', error.message)
    return null
  }

  const grant = data?.grants as DetailGrantRow | null
  if (!data || !grant) return null

  return {
    verdict: data.verdict as Verdict,
    confidence: Number(data.confidence),
    reasons: toStringArray(data.reasons),
    unclearPoints: toStringArray(data.unclear_points),
    grant: {
      id: grant.id,
      title: grant.title,
      summary: grant.summary,
      detailText: grant.detail_text,
      issuer: grant.issuer,
      targetArea: grant.target_area,
      targetEmployees: grant.target_employees,
      maxAmount: grant.max_amount,
      subsidyRate: grant.subsidy_rate,
      acceptanceStartAt: grant.acceptance_start_at,
      acceptanceEndAt: grant.acceptance_end_at,
      externalUrl: grant.external_url,
      fetchedAt: grant.fetched_at,
    },
  }
}

// ---------------------------------------------------------------------------
// SaaS 管理者向け（全テナント横断）
// ---------------------------------------------------------------------------

export interface BatchRunView {
  id: string
  step: string
  status: string
  startedAt: string
  finishedAt: string | null
  processedCount: number
  errorMessage: string | null
}

export interface SaasGrantNotifierDashboard {
  tenantOps: TenantOpsRow[]
  batch: BatchSummary
  llm: LlmCostSummary
  sources: { name: string; lastFetchedAt: string | null }[]
  batchRuns: BatchRunView[]
  anomalies: string[]
}

const EMPTY_DASHBOARD: SaasGrantNotifierDashboard = {
  tenantOps: [],
  batch: { failedCount: 0, lastByStep: {} },
  llm: { totalCostUsd: 0, byStep: {} },
  sources: [],
  batchRuns: [],
  anomalies: [],
}

async function isSaasAdmin(): Promise<boolean> {
  const user = await getServerUser()
  return !!user && (user.role === 'supaUser' || user.appRole === 'developer')
}

/**
 * /saas_adm/grant-notifier のダッシュボードデータ。
 * SaaS 管理者のみが呼べる。全テナント横断のため createAdminClient() を使う。
 */
export async function getSaasGrantNotifierDashboard(): Promise<SaasGrantNotifierDashboard> {
  if (!(await isSaasAdmin())) return EMPTY_DASHBOARD

  const supabase = createAdminClient()
  const [tenants, conditions, deliveries, matchResults, batchRuns, llmUsage, sources] =
    await Promise.all([
      supabase.from('tenants').select('id, name'),
      supabase.from('grant_tenant_conditions').select('tenant_id, delivery_frequency'),
      supabase.from('grant_deliveries').select('tenant_id, sent_at'),
      supabase.from('grant_match_results').select('tenant_id, verdict'),
      supabase
        .from('grant_batch_runs')
        .select('id, step, status, started_at, finished_at, processed_count, error_message')
        .order('started_at', { ascending: false })
        .limit(20),
      supabase.from('grant_llm_usage').select('step, cost_usd'),
      supabase.from('grant_sources').select('name, last_fetched_at'),
    ])

  const tenantOps = buildTenantOps({
    tenants: tenants.data ?? [],
    conditions: conditions.data ?? [],
    deliveries: deliveries.data ?? [],
    matchResults: matchResults.data ?? [],
  })
  const batch = summarizeBatchRuns(batchRuns.data ?? [])
  const llm = aggregateLlmCost(llmUsage.data ?? [])
  const sourceRows = sources.data ?? []

  return {
    tenantOps,
    batch,
    llm,
    sources: sourceRows.map(s => ({ name: s.name, lastFetchedAt: s.last_fetched_at })),
    batchRuns: (batchRuns.data ?? []).map(r => ({
      id: r.id,
      step: r.step,
      status: r.status,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      processedCount: r.processed_count,
      errorMessage: r.error_message,
    })),
    anomalies: detectAnomalies({
      tenantOps,
      sources: sourceRows,
      failedBatchCount: batch.failedCount,
      now: new Date().toISOString(),
    }),
  }
}
