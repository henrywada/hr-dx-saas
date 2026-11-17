/**
 * 集団分析の各集団を「仕事のストレス判定図」の表・プロット用の行に変換する純関数。
 * 帳票（docs/stress/結果帳票サンプル.pdf「仕事のストレス判定図（複数の職場）」）と同じく、
 * 4 尺度の平均点・(A)・(B)・総合健康リスク・前回比を並べる。
 */

import { calcJobStressHealthRisk } from '@/features/stress-check/job-stress-chart'
import type { GroupData } from './queries'

export interface JudgmentRow {
  id: string
  /** 判定図中の番号（プロットできる集団だけに 1 から振る） */
  label: string
  name: string
  memberCount: number
  /** 下限人数未満でマスキングされた集団（人数も含めて表示しない） */
  isSuppressed: boolean
  isPlottable: boolean
  workload: number | null
  control: number | null
  supervisor: number | null
  colleague: number | null
  riskA: number | null
  riskB: number | null
  /** 総合健康リスク（集団分析ビューの値。個人の得点から計算した平均で算出済み） */
  total: number | null
  /** 総合健康リスクの前回比 */
  totalDiff: number | null
}

export function buildJudgmentRows(groups: GroupData[]): JudgmentRow[] {
  let seq = 0
  return groups.map(g => {
    const { workload, control, supervisor_support: supervisor, colleague_support: colleague } = g
    const isPlottable =
      !g.is_suppressed &&
      workload != null &&
      control != null &&
      supervisor != null &&
      colleague != null
    const risk = isPlottable
      ? calcJobStressHealthRisk({ workload, control, supervisor, colleague })
      : null
    const total = g.is_suppressed ? null : g.health_risk
    const totalDiff =
      total != null && g.previous_health_risk != null
        ? Math.round((total - g.previous_health_risk) * 10) / 10
        : null

    return {
      id: g.division_id,
      label: isPlottable ? String(++seq) : '',
      name: g.name,
      memberCount: g.member_count,
      isSuppressed: Boolean(g.is_suppressed),
      isPlottable,
      workload,
      control,
      supervisor,
      colleague,
      riskA: risk?.riskA ?? null,
      riskB: risk?.riskB ?? null,
      total,
      totalDiff,
    }
  })
}
