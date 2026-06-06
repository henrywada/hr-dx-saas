import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  ReferralPosting,
  ReferralNomination,
  ReferralReward,
  ReferralRankingItem,
  ReferralSummary,
  NominationStatus,
  RewardStatus,
} from './types'
import { ACTIVE_NOMINATION_STATUSES } from './types'

// ============================================================
// 管理者向けクエリ
// ============================================================

/** 推薦一覧取得（ステータス・求人フィルタ対応） */
export async function getReferralNominations(filters?: {
  status?: NominationStatus | 'active'
  referral_posting_id?: string
}): Promise<ReferralNomination[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  let query = supabase
    .from('referral_nominations')
    .select(
      `
      *,
      referral_posting:referral_postings(id, title, reward_amount),
      referrer:employees!referrer_employee_id(id, name)
    `
    )
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'active') {
    query = query.eq('status', filters.status)
  } else if (filters?.status === 'active') {
    query = query.in('status', ACTIVE_NOMINATION_STATUSES)
  }

  if (filters?.referral_posting_id) {
    query = query.eq('referral_posting_id', filters.referral_posting_id)
  }

  const { data, error } = await query
  if (error) {
    console.error('getReferralNominations error:', error)
    return []
  }
  return (data ?? []) as ReferralNomination[]
}

/** 推薦詳細取得 */
export async function getReferralNominationById(id: string): Promise<ReferralNomination | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('referral_nominations')
    .select(
      `
      *,
      referral_posting:referral_postings(id, title, reward_amount),
      referrer:employees!referrer_employee_id(id, name)
    `
    )
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (error) {
    console.error('getReferralNominationById error:', error)
    return null
  }
  return data as ReferralNomination
}

/** リファラル求人一覧 */
export async function getReferralPostings(activeOnly = false): Promise<ReferralPosting[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  let query = supabase
    .from('referral_postings')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) {
    console.error('getReferralPostings error:', error)
    return []
  }
  return (data ?? []) as ReferralPosting[]
}

/** 求人ごとの推薦件数を含む求人一覧 */
export async function getReferralPostingsWithCount(): Promise<
  (ReferralPosting & { nomination_count: number })[]
> {
  const postings = await getReferralPostings()
  if (postings.length === 0) return []

  const user = await getServerUser()
  if (!user?.tenant_id) return postings.map(p => ({ ...p, nomination_count: 0 }))

  const supabase = await createClient()
  const { data: counts } = await supabase
    .from('referral_nominations')
    .select('referral_posting_id')
    .eq('tenant_id', user.tenant_id)
    .in(
      'referral_posting_id',
      postings.map(p => p.id)
    )

  const countMap: Record<string, number> = {}
  for (const row of counts ?? []) {
    countMap[row.referral_posting_id] = (countMap[row.referral_posting_id] ?? 0) + 1
  }

  return postings.map(p => ({ ...p, nomination_count: countMap[p.id] ?? 0 }))
}

/** 報奨金一覧 */
export async function getReferralRewards(filters?: {
  status?: RewardStatus
}): Promise<ReferralReward[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  let query = supabase
    .from('referral_rewards')
    .select(
      `
      *,
      nomination:referral_nominations(id, nominee_name, referral_posting_id),
      referrer:employees!referrer_employee_id(id, name)
    `
    )
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) {
    console.error('getReferralRewards error:', error)
    return []
  }
  return (data ?? []) as ReferralReward[]
}

/** 推薦件数ランキング（デフォルト上位10名） */
export async function getReferralRanking(limit = 10): Promise<ReferralRankingItem[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('referral_nominations')
    .select('referrer_employee_id, status, referrer:employees!referrer_employee_id(id, name)')
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('getReferralRanking error:', error)
    return []
  }

  const rankMap: Record<string, ReferralRankingItem> = {}
  for (const row of data ?? []) {
    const id = row.referrer_employee_id
    const referrer = row.referrer as { id: string; name: string } | null
    if (!id || !referrer) continue
    if (!rankMap[id]) {
      rankMap[id] = {
        employee_id: id,
        employee_name: referrer.name,
        total_nominations: 0,
        hired_count: 0,
      }
    }
    rankMap[id].total_nominations++
    if (row.status === 'hired') rankMap[id].hired_count++
  }

  return Object.values(rankMap)
    .sort((a, b) => b.total_nominations - a.total_nominations || b.hired_count - a.hired_count)
    .slice(0, limit)
}

/** 管理者向けダッシュボードサマリー */
export async function getReferralSummary(): Promise<ReferralSummary> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { total_active: 0, hired_this_month: 0, pending_rewards: 0, pending_reward_amount: 0 }
  }

  const supabase = await createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [activeResult, hiredResult, rewardResult] = await Promise.all([
    supabase
      .from('referral_nominations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)
      .in('status', ACTIVE_NOMINATION_STATUSES),
    supabase
      .from('referral_nominations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'hired')
      .gte('updated_at', monthStart),
    supabase
      .from('referral_rewards')
      .select('amount')
      .eq('tenant_id', user.tenant_id)
      .eq('status', 'pending'),
  ])

  const pendingRewardRows = rewardResult.data ?? []
  const pendingAmount = pendingRewardRows.reduce((sum, r) => sum + (r.amount ?? 0), 0)

  return {
    total_active: activeResult.count ?? 0,
    hired_this_month: hiredResult.count ?? 0,
    pending_rewards: pendingRewardRows.length,
    pending_reward_amount: pendingAmount,
  }
}

// ============================================================
// 従業員向けクエリ（hr_notes は取得しない）
// ============================================================

/** 公開中のリファラル求人一覧 */
export async function getActiveReferralPostings(): Promise<ReferralPosting[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('referral_postings')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getActiveReferralPostings error:', error)
    return []
  }
  return (data ?? []) as ReferralPosting[]
}

/** 自分の推薦一覧（hr_notes は除外） */
export async function getMyNominations(employeeId: string): Promise<ReferralNomination[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('referral_nominations')
    .select(
      `
      id, tenant_id, referral_posting_id, referrer_employee_id,
      nominee_name, nominee_email, nominee_phone,
      relationship, nomination_reason,
      status, hired_at, created_at, updated_at,
      referral_posting:referral_postings(id, title, reward_amount)
    `
    )
    .eq('tenant_id', user.tenant_id)
    .eq('referrer_employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getMyNominations error:', error)
    return []
  }
  return (data ?? []) as ReferralNomination[]
}

/** 自分の推薦に関連する報奨金情報 */
export async function getMyRewards(employeeId: string): Promise<ReferralReward[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('referral_rewards')
    .select('id, nomination_id, amount, status, scheduled_date, paid_at, created_at, updated_at')
    .eq('tenant_id', user.tenant_id)
    .eq('referrer_employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getMyRewards error:', error)
    return []
  }
  return (data ?? []) as ReferralReward[]
}
