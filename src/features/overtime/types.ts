/** POST /api/overtime/applications のリクエストボディ */
export type OvertimeApplicationRequestBody = {
  work_date: string
  overtime_start: string
  overtime_end: string
  reason: string
}

/** POST /api/overtime/applications の成功レスポンス */
export type OvertimeApplicationResponse = {
  id: string
  status: string
}

/** 残業申請一覧（月次テーブル1行） */
export type OvertimeMonthRow = {
  /** YYYY-MM-DD */
  workDate: string
  /** 表示用（出勤）。データなしは null */
  clockInDisplay: string | null
  clockOutDisplay: string | null
  overtimeStartDisplay: string | null
  overtimeEndDisplay: string | null
  overtimeHoursDisplay: string | null
  reasonDisplay: string | null
  /** 勤怠ソース（work_time_records.source の表示ラベル） */
  sourceDisplay: string | null
  statusDisplay: string | null
  /** 勤怠の休暇フラグ（work_time_records.is_holiday。CSV 取り込みの「休日」列と同一） */
  isLeaveDay: boolean
  /** 既存残業申請があるときモーダル初期値用（timestamptz ISO） */
  overtimeStartIso: string | null
  overtimeEndIso: string | null
  /** 既存申請の理由（初期表示・詳細モーダル用の全文） */
  reasonRaw: string | null
  /** 承認者コメント（詳細モーダル用） */
  supervisorCommentRaw: string | null
  /** その日に残業申請レコードがある（理由列に詳細アイコンを出す） */
  hasOvertimeApplication: boolean
}
