import type { ConsultationCategory, ConsultationStatus } from './types'

export const CATEGORY_LABEL: Record<ConsultationCategory, string> = {
  harassment: 'ハラスメント',
  mental_health: 'メンタルヘルス',
  workload: '業務量',
  interpersonal: '人間関係',
  other: 'その他',
}

export const STATUS_LABEL: Record<ConsultationStatus, string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済み',
}
