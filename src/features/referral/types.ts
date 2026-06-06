// リファラル採用管理（NEW-4）型定義

/** リファラル対象求人 */
export interface ReferralPosting {
  id: string
  tenant_id: string
  job_posting_id: string | null
  title: string
  description: string | null
  department: string | null
  employment_type: 'full_time' | 'part_time' | 'contract' | null
  reward_amount: number
  reward_condition: string | null
  is_active: boolean
  deadline: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export const EMPLOYMENT_TYPE_LABELS: Record<
  NonNullable<ReferralPosting['employment_type']>,
  string
> = {
  full_time: '正社員',
  part_time: 'パート・アルバイト',
  contract: '契約社員',
}

/** 推薦ステータス */
export type NominationStatus =
  | 'pending'
  | 'reviewing'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn'

export const NOMINATION_STATUS_LABELS: Record<NominationStatus, string> = {
  pending: '推薦受付',
  reviewing: '書類選考中',
  interview: '面接中',
  offered: '内定',
  hired: '入社確定',
  rejected: '不採用',
  withdrawn: '辞退',
}

/** 入社確定時に報奨金レコードを自動生成するトリガーステータス */
export const REWARD_TRIGGER_STATUS: NominationStatus = 'hired'

/** 選考中のアクティブステータス */
export const ACTIVE_NOMINATION_STATUSES: NominationStatus[] = [
  'pending',
  'reviewing',
  'interview',
  'offered',
]

/** 選考終了ステータス */
export const CLOSED_NOMINATION_STATUSES: NominationStatus[] = ['hired', 'rejected', 'withdrawn']

/** 推薦記録 */
export interface ReferralNomination {
  id: string
  tenant_id: string
  referral_posting_id: string
  referrer_employee_id: string
  nominee_name: string
  nominee_email: string | null
  nominee_phone: string | null
  relationship: string | null
  nomination_reason: string | null
  status: NominationStatus
  hr_notes: string | null
  hired_at: string | null
  created_at: string
  updated_at: string
  // JOIN で取得
  referral_posting?: Pick<ReferralPosting, 'id' | 'title' | 'reward_amount'> | null
  referrer?: { id: string; name: string } | null
}

/** 報奨金支払いステータス */
export type RewardStatus = 'pending' | 'approved' | 'paid' | 'cancelled'

export const REWARD_STATUS_LABELS: Record<RewardStatus, string> = {
  pending: '支払い待ち',
  approved: '承認済み',
  paid: '支払い完了',
  cancelled: 'キャンセル',
}

/** 報奨金支払いレコード */
export interface ReferralReward {
  id: string
  tenant_id: string
  nomination_id: string
  referrer_employee_id: string
  amount: number
  status: RewardStatus
  scheduled_date: string | null
  paid_at: string | null
  approved_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // JOIN
  nomination?: Pick<ReferralNomination, 'id' | 'nominee_name' | 'referral_posting_id'> | null
  referrer?: { id: string; name: string } | null
}

/** 推薦フォーム入力（従業員向け） */
export interface CreateNominationInput {
  referral_posting_id: string
  nominee_name: string
  nominee_email?: string
  nominee_phone?: string
  relationship?: string
  nomination_reason?: string
}

/** ステータス更新入力（人事向け） */
export interface UpdateNominationStatusInput {
  status: NominationStatus
  hr_notes?: string
  hired_at?: string
}

/** 報奨金ステータス更新入力 */
export interface UpdateRewardStatusInput {
  status: RewardStatus
  scheduled_date?: string
  paid_at?: string
  notes?: string
}

/** リファラル求人作成・更新入力 */
export type UpsertReferralPostingInput = Omit<
  ReferralPosting,
  'id' | 'tenant_id' | 'created_by' | 'created_at' | 'updated_at'
>

/** 推薦件数ランキング */
export interface ReferralRankingItem {
  employee_id: string
  employee_name: string
  total_nominations: number
  hired_count: number
}

/** 管理者向けサマリー */
export interface ReferralSummary {
  total_active: number
  hired_this_month: number
  pending_rewards: number
  pending_reward_amount: number
}
