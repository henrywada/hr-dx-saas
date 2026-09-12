'use client'

import type { EmployeeCrossAnalysisResult } from '../../cross-analysis'

interface AttentionSummaryCardsProps {
  results: EmployeeCrossAnalysisResult[]
}

/** 要注意人数・分析対象人数・フラグ別内訳のKPIカード */
export function AttentionSummaryCards({ results }: AttentionSummaryCardsProps) {
  const attentionCount = results.filter(r => r.isAttentionNeeded).length
  const sustainedCount = results.filter(r => r.flags.sustainedOvertime).length
  const gapCount = results.filter(r => r.flags.underReportedGap).length
  const concentrationCount = results.filter(r => r.flags.workloadConcentration).length

  const cards: Array<{ label: string; value: number; accent: string }> = [
    { label: '要注意メンバー', value: attentionCount, accent: 'text-red-600' },
    { label: '分析対象人数', value: results.length, accent: 'text-slate-900' },
    { label: '継続的残業', value: sustainedCount, accent: 'text-amber-600' },
    { label: '申告乖離', value: gapCount, accent: 'text-orange-600' },
    { label: 'タスク集中', value: concentrationCount, accent: 'text-orange-600' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map(card => (
        <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs text-slate-500">{card.label}</p>
          <p className={`mt-1 text-2xl font-bold ${card.accent}`}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}
