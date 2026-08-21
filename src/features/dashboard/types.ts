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
  /** 生の ISO 8601 タイムスタンプ（フィード集約層のソート用） */
  publishedAt: string
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
  /** 掲載期限（NULL=無期限） */
  expires_at: string | null
  is_new: boolean
  target_audience: string | null
  recipient_employee_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/** 管理画面のお知らせ一覧に添える受信者選択肢 */
export type EmployeeOption = {
  id: string
  name: string
}
