'use client'

import { useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AttentionSummaryCards } from './AttentionSummaryCards'
import { EmployeeCrossAnalysisTable } from './EmployeeCrossAnalysisTable'
import { OvertimeVsWorkloadChart } from './OvertimeVsWorkloadChart'
import type { EmployeeCrossAnalysisResult } from '../../cross-analysis'
import type { DivisionOption } from '@/features/task-management/queries'

interface WorkloadOvertimeDashboardProps {
  results: EmployeeCrossAnalysisResult[]
  divisions: DivisionOption[]
  selectedDivisionId: string | null
}

/** 工数×残業クロス分析ダッシュボードの部門フィルタ + サマリー・チャート・一覧の並び */
export function WorkloadOvertimeDashboard({
  results,
  divisions,
  selectedDivisionId,
}: WorkloadOvertimeDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') {
      params.delete('division')
    } else {
      params.set('division', value)
    }
    // クエリが空になった場合は末尾の裸の「?」が残らないようパスのみに遷移する
    const queryString = params.toString()
    const href = queryString ? `${pathname}?${queryString}` : pathname
    startTransition(() => router.push(href))
  }

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto max-w-[1920px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">工数×残業クロス分析</h1>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          部門
          <select
            value={selectedDivisionId ?? ''}
            onChange={e => handleDivisionChange(e.target.value)}
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs disabled:opacity-60"
          >
            <option value="">全社</option>
            <option value="unassigned">未配属</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {isPending && <span className="text-xs text-slate-400">更新中...</span>}
        </label>
      </div>

      <AttentionSummaryCards results={results} />
      <OvertimeVsWorkloadChart results={results} />
      <EmployeeCrossAnalysisTable results={results} />
    </div>
  )
}
