'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { APP_ROUTES } from '@/config/routes'
import { AdmHrKpiLink } from './AdmHrKpiLink'

interface EvaluationPeriodOption {
  id: string
  name: string
}

interface EvaluationDashboardCardProps {
  icon: ReactNode
  iconClassName?: string
  completionRatePercent: number | null
  selectedPeriodId: string | null
  periods: EvaluationPeriodOption[]
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

/** EV-S1: 評価期間を選択して完了率 KPI を切り替えるダッシュボードカード */
export function EvaluationDashboardCard({
  icon,
  iconClassName = 'bg-blue-50 text-blue-600',
  completionRatePercent,
  selectedPeriodId,
  periods,
}: EvaluationDashboardCardProps) {
  const router = useRouter()

  const detailHref =
    selectedPeriodId != null
      ? `${APP_ROUTES.EVALUATION.ADMIN_LIST}?period=${selectedPeriodId}`
      : APP_ROUTES.EVALUATION.ADMIN_LIST

  function handlePeriodChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.preventDefault()
    e.stopPropagation()
    const periodId = e.target.value
    router.push(
      periodId
        ? `${APP_ROUTES.TENANT.ADMIN}?evalPeriod=${periodId}`
        : APP_ROUTES.TENANT.ADMIN
    )
  }

  return (
    <div className="-m-2 flex items-start gap-2 rounded-md p-2 transition-colors hover:bg-[#f6f8fa]">
      <Link href={detailHref} className={`shrink-0 rounded-md p-1.5 ${iconClassName}`}>
        {icon}
      </Link>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link href={detailHref} className="text-sm font-bold text-[#161b22] hover:underline">
            パフォーマンス評価
          </Link>
          <Badge variant="primary" className="ml-auto px-2 py-0.5 text-[10px]">
            NEW
          </Badge>
        </div>
        <p className="text-xs leading-relaxed text-[#57606a]">
          目標設定・自己評価・上長評価のワークフローを管理。評価期間を切り替えて完了率を把握。
        </p>
        {periods.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="adm-eval-period" className="text-[10px] font-medium text-[#57606a]">
              評価期間
            </label>
            <select
              id="adm-eval-period"
              value={selectedPeriodId ?? ''}
              onChange={handlePeriodChange}
              className="rounded-md border border-[#e2e6ec] bg-white px-2 py-1 text-xs text-[#161b22] shadow-xs focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-[#FD7601]"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-[10px] text-[#57606a]">評価期間が未登録です</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href={detailHref}
            className={`inline-flex items-center gap-1.5 rounded-md border border-white/60 px-2.5 py-1 text-xs font-medium shadow-sm transition-opacity hover:opacity-90 ${iconClassName}`}
          >
            評価完了率
            <span className="font-bold text-[#161b22]">{formatPercent(completionRatePercent)}</span>
          </Link>
          <span className="inline-flex items-center rounded-md border border-[#e2e6ec] bg-white px-2 py-1">
            <AdmHrKpiLink section="development" />
          </span>
        </div>
      </div>
    </div>
  )
}
