import { createClient } from '@/lib/supabase/server'
import {
  JobPosting,
  Candidate,
  CandidateStage,
  CLOSED_STAGES,
  FunnelStageCount,
  AssigneeTaskCount,
  WithdrawalRatePoint,
  FunnelDashboardData,
  ACTIVE_STAGES,
  JobPostingAiVariant,
  TenantBrandingInfo,
} from './types'

// 人事向け。自テナントのすべての求人を取得。
export async function getTenantJobPostings(): Promise<JobPosting[]> {
  const supabase = await createClient()

  // RLS により、自動的に自テナントの求人のみが取得される
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getTenantJobPostings error:', error)
    throw new Error('求人票の取得に失敗しました。')
  }

  return data as JobPosting[]
}

// 人事向け。自テナントの特定の求人を取得。
export async function getTenantJobPostingById(id: string): Promise<JobPosting | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from('job_postings').select('*').eq('id', id).single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('getTenantJobPostingById error:', error)
    throw new Error('求人票の取得に失敗しました。')
  }

  return data as JobPosting
}

// 外部公開用。公開状態（status='published'）の特定の求人を取得。
export async function getPublishedJob(id: string): Promise<JobPosting | null> {
  const supabase = await createClient()

  // 一般クライアントでも status='published' なら RLS の job_postings_public_select によって取得可能。
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // 見つからない場合
    console.error('getPublishedJob error:', error)
    throw new Error('求人の取得に失敗しました。')
  }

  return data as JobPosting
}

// ============================================================
// 採用ファネルダッシュボード用クエリ（P1-A）
// ============================================================

const STALE_DEFAULT_DAYS = 7

/** ステージ別カウントを集計するヘルパー */
function aggregateFunnelCounts(
  rows: { stage: string; last_action_at: string }[],
  staleThreshold: Date
): FunnelStageCount[] {
  const countMap = new Map<CandidateStage, { count: number; stale: number }>()

  for (const stage of ACTIVE_STAGES) {
    countMap.set(stage, { count: 0, stale: 0 })
  }

  for (const row of rows) {
    const stage = row.stage as CandidateStage
    if (!ACTIVE_STAGES.includes(stage)) continue
    const entry = countMap.get(stage)!
    entry.count++
    if (new Date(row.last_action_at) < staleThreshold) {
      entry.stale++
    }
  }

  return ACTIVE_STAGES.map(stage => {
    const entry = countMap.get(stage)!
    return { stage, count: entry.count, stale_count: entry.stale }
  })
}

/** 担当者別件数を集計するヘルパー */
function aggregateAssigneeCounts(
  rows: {
    assigned_to: string | null
    last_action_at: string
    assignee: { id: string; name: string } | null
  }[],
  staleThreshold: Date
): AssigneeTaskCount[] {
  const map = new Map<string, { name: string; active: number; stale: number }>()

  for (const row of rows) {
    if (!row.assigned_to || !row.assignee) continue
    const key = row.assigned_to
    if (!map.has(key)) {
      map.set(key, { name: row.assignee.name, active: 0, stale: 0 })
    }
    const entry = map.get(key)!
    entry.active++
    if (new Date(row.last_action_at) < staleThreshold) {
      entry.stale++
    }
  }

  return Array.from(map.entries())
    .map(([employee_id, v]) => ({
      employee_id,
      employee_name: v.name,
      active_count: v.active,
      stale_count: v.stale,
    }))
    .sort((a, b) => b.active_count - a.active_count)
}

/** 月別辞退率を集計するヘルパー */
function aggregateWithdrawalTrend(
  rows: { stage: string; created_at: string }[]
): WithdrawalRatePoint[] {
  const map = new Map<string, { offered: number; withdrawn: number }>()

  for (const row of rows) {
    const month = row.created_at.slice(0, 7) // 'YYYY-MM'
    if (!map.has(month)) map.set(month, { offered: 0, withdrawn: 0 })
    const entry = map.get(month)!
    if (row.stage === 'offered') entry.offered++
    if (row.stage === 'withdrawn') entry.withdrawn++
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { offered, withdrawn }]) => ({
      month,
      offered,
      withdrawn,
      rate: offered > 0 ? Math.round((withdrawn / offered) * 1000) / 10 : 0,
    }))
}

/**
 * 採用ファネルダッシュボード用データを並列取得・集計して返す。
 * page.tsx（Server Component）から呼び出す専用関数。
 */
export async function getRecruitFunnelData(
  staleThresholdDays = STALE_DEFAULT_DAYS
): Promise<FunnelDashboardData> {
  const supabase = await createClient()

  const staleThreshold = new Date()
  staleThreshold.setDate(staleThreshold.getDate() - staleThresholdDays)

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const closedIn = `(${CLOSED_STAGES.join(',')})`

  const [funnelRes, staleRes, assigneeRes, withdrawalRes] = await Promise.all([
    // アクティブ候補者のステージ・最終アクション日（ファネル集計用）
    supabase.from('candidates').select('stage, last_action_at').not('stage', 'in', closedIn),

    // 放置候補者（入社・不採用・辞退を除いてN日以上未アクション）
    supabase
      .from('candidates')
      .select('*, job_posting:job_postings(id, title)')
      .not('stage', 'in', closedIn)
      .lt('last_action_at', staleThreshold.toISOString())
      .order('last_action_at', { ascending: true }),

    // 担当者別アクティブ件数
    supabase
      .from('candidates')
      .select(
        'assigned_to, last_action_at, assignee:employees!candidates_assigned_to_fkey(id, name)'
      )
      .not('stage', 'in', closedIn),

    // 辞退率推移（過去6ヶ月の offered / withdrawn 候補者）
    supabase
      .from('candidates')
      .select('stage, created_at')
      .in('stage', ['offered', 'withdrawn'])
      .gte('created_at', sixMonthsAgo.toISOString()),
  ])

  if (funnelRes.error) console.error('getRecruitFunnelData funnelRes:', funnelRes.error)
  if (staleRes.error) console.error('getRecruitFunnelData staleRes:', staleRes.error)
  if (assigneeRes.error) console.error('getRecruitFunnelData assigneeRes:', assigneeRes.error)
  if (withdrawalRes.error) console.error('getRecruitFunnelData withdrawalRes:', withdrawalRes.error)

  return {
    funnelCounts: aggregateFunnelCounts(funnelRes.data ?? [], staleThreshold),
    staleCandidates: (staleRes.data ?? []) as Candidate[],
    assigneeCounts: aggregateAssigneeCounts(
      (assigneeRes.data ?? []) as {
        assigned_to: string | null
        last_action_at: string
        assignee: { id: string; name: string } | null
      }[],
      staleThreshold
    ),
    withdrawalTrend: aggregateWithdrawalTrend(withdrawalRes.data ?? []),
    staleThresholdDays,
  }
}

/** ステージでフィルタした候補者一覧を取得（CandidateTable のドリルダウン用） */
export async function getCandidatesByStage(stage: CandidateStage): Promise<Candidate[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('candidates')
    .select(
      '*, job_posting:job_postings(id, title), assignee:employees!candidates_assigned_to_fkey(id, name)'
    )
    .eq('stage', stage)
    .order('last_action_at', { ascending: true })

  if (error) {
    console.error('getCandidatesByStage error:', error)
    throw new Error('候補者一覧の取得に失敗しました。')
  }

  return (data ?? []) as Candidate[]
}

// ── NEW-3 採用ブランディング支援 ──────────────────────────────────────────

/** 求人票に紐づくAIバリアント一覧を取得（新しい順） */
export async function getJobPostingAiVariants(
  jobPostingId: string
): Promise<JobPostingAiVariant[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_posting_ai_variants')
    .select('*')
    .eq('job_posting_id', jobPostingId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('AIバリアントの取得に失敗しました。')

  return (data ?? []) as JobPostingAiVariant[]
}

/** テナントのブランディング補足情報を取得 */
export async function getTenantBrandingInfo(): Promise<TenantBrandingInfo | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: employee } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  if (!employee) return null

  const { data, error } = await supabase
    .from('tenants')
    .select('industry, founding_year, recruitment_strengths')
    .eq('id', employee.tenant_id)
    .single()

  if (error) return null

  return data as TenantBrandingInfo
}
