export type ImportantTask = {
  title: string
  description?: string | null
  deadlineLabel: string
  linkPath: string
  isPending: boolean
}

export type Announcement = {
  id: string
  dateLabel: string
  title: string
  body: string | null
  targetAudience: string | null
  isNew: boolean
}

/** 管理画面用: お知らせの行データ */
export type AnnouncementRow = {
  id: string
  tenant_id: string
  title: string
  body: string | null
  published_at: string
  is_new: boolean
  target_audience: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/** 管理画面用: パルス調査期間の行データ */
export type PulseSurveyPeriodRow = {
  id: string
  tenant_id: string
  survey_period: string
  title: string
  description: string | null
  deadline_date: string
  link_path: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

