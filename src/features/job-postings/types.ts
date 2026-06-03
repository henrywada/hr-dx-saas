export interface JobPosting {
  id: string
  tenant_id: string
  status: 'draft' | 'published' | 'closed'
  title: string | null
  raw_memo: string | null
  description: string | null
  employment_type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'TEMPORARY' | 'INTERN' | null
  salary_min: number | null
  salary_max: number | null
  salary_unit: 'YEAR' | 'MONTH' | 'HOUR' | null
  postal_code: string | null
  address_region: string | null
  address_locality: string | null
  street_address: string | null
  published_at: string | null
  valid_through: string | null
  created_at: string
  updated_at: string
}

export type InsertJobPosting = Omit<JobPosting, 'id' | 'created_at' | 'updated_at'> & {
  tenant_id: string
}

export type UpdateJobPosting = Partial<
  Omit<JobPosting, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
>

// ============================================================
// 採用ファネルダッシュボード用型定義（P1-A）
// ============================================================

/** 候補者のファネルステージ（candidates.stage の固定値） */
export type CandidateStage =
  | 'applied' // 応募
  | 'screening' // 書類選考
  | 'interview_1' // 一次面接
  | 'interview_2' // 二次面接
  | 'final' // 最終面接
  | 'offered' // 内定
  | 'hired' // 入社
  | 'rejected' // 不採用
  | 'withdrawn' // 辞退

/** ステージ表示ラベル（日本語） */
export const STAGE_LABELS: Record<CandidateStage, string> = {
  applied: '応募',
  screening: '書類選考',
  interview_1: '一次面接',
  interview_2: '二次面接',
  final: '最終面接',
  offered: '内定',
  hired: '入社',
  rejected: '不採用',
  withdrawn: '辞退',
}

/** ファネル表示対象のアクティブステージ（辞退・不採用を除く） */
export const ACTIVE_STAGES: CandidateStage[] = [
  'applied',
  'screening',
  'interview_1',
  'interview_2',
  'final',
  'offered',
  'hired',
]

/** 選考終了ステージ（放置チェック・担当者集計から除外） */
export const CLOSED_STAGES: CandidateStage[] = ['hired', 'rejected', 'withdrawn']

export interface Candidate {
  id: string
  tenant_id: string
  job_posting_id: string | null
  name: string
  email: string | null
  phone: string | null
  stage: CandidateStage
  assigned_to: string | null
  last_action_at: string
  notes: string | null
  created_at: string
  updated_at: string
  // JOINで取得する関連データ
  job_posting?: Pick<JobPosting, 'id' | 'title'> | null
  assignee?: { id: string; name: string } | null
}

export type CreateCandidateInput = {
  job_posting_id?: string
  name: string
  email?: string
  phone?: string
  stage?: CandidateStage
  assigned_to?: string
  notes?: string
}

export type UpdateCandidateInput = Partial<
  Pick<Candidate, 'stage' | 'assigned_to' | 'notes' | 'email' | 'phone'>
>

/** ファネル各ステージの件数サマリー */
export interface FunnelStageCount {
  stage: CandidateStage
  count: number
  stale_count: number // N日以上未アクションの件数
}

/** 担当者別アクティブ件数 */
export interface AssigneeTaskCount {
  employee_id: string
  employee_name: string
  active_count: number
  stale_count: number // N日以上未アクションの件数
}

/** 月別内定辞退率の推移データ点 */
export interface WithdrawalRatePoint {
  month: string // 'YYYY-MM' 形式
  offered: number
  withdrawn: number
  rate: number // withdrawn / offered * 100（小数点1桁）
}

/** 採用ファネルダッシュボード全体のデータ */
export interface FunnelDashboardData {
  funnelCounts: FunnelStageCount[]
  staleCandidates: Candidate[]
  assigneeCounts: AssigneeTaskCount[]
  withdrawalTrend: WithdrawalRatePoint[]
  staleThresholdDays: number
}
