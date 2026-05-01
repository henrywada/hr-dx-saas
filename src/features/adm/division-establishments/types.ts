import type { StressCheckPeriod } from '@/features/stress-check/types'

/** 拠点マスタ（division_establishments） */
export type DivisionEstablishmentRow = {
  id: string
  tenant_id: string
  name: string
  code: string | null
  workplace_address: string | null
  labor_office_reporting_name: string | null
  created_at: string
  updated_at: string
}

/** アンカー1件分の表示用（組織ツリー上の位置が分かるようパス付き） */
export type EstablishmentAnchorDisplay = {
  division_id: string
  name: string | null
  layer: number | null
  /** ルート → 当該部署 の階層ラベル */
  path_label: string
  /** このアンカー（またはその配下所属）として拠点に紐づく従業員数（親を遡って最初にこのアンカーに一致した人数） */
  employee_count: number
}

export type DivisionEstablishmentListItem = DivisionEstablishmentRow & {
  anchors: EstablishmentAnchorDisplay[]
  /** 一覧1行目用：実施中を優先、なければ最新の実施期間 */
  stress_check_period_list: StressCheckPeriod | null
}
