import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import type { GrowthDevelopmentKpi } from '../types'

interface Props {
  kpi: GrowthDevelopmentKpi
}

function fmtPercent(v: number | null): string {
  if (v == null) return '—'
  return `${v}%`
}

interface CardProps {
  label: string
  value: string
  sub: string
  href: string
  alert?: boolean
}

function GrowthCard({ label, value, sub, href, alert }: CardProps) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-[#FD7601]/40 hover:bg-orange-50/30"
    >
      <span className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </span>
      <span className="mt-1 text-sm font-medium text-gray-700">{label}</span>
      <span className="mt-0.5 text-xs text-gray-400">{sub}</span>
    </Link>
  )
}

/** 評価・1on1・スキル・eラーニングの横断KPIカード */
export function GrowthDevelopmentCards({ kpi }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <GrowthCard
        label="評価完了率"
        value={fmtPercent(kpi.evaluationCompletionRatePercent)}
        sub="直近評価期間"
        href={APP_ROUTES.EVALUATION.ADMIN_LIST}
      />
      <GrowthCard
        label="1on1（30日）"
        value={`${kpi.oneOnOneSessionsLast30Days}件`}
        sub={`未実施 ${kpi.oneOnOneOverdueCount}名`}
        href={APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE}
        alert={kpi.oneOnOneOverdueCount > 0}
      />
      <GrowthCard
        label="スキルギャップ率"
        value={fmtPercent(kpi.skillGapRatePercent)}
        sub="要件未達の割合"
        href={APP_ROUTES.TENANT.ADMIN_SKILL_MAP}
        alert={kpi.skillGapRatePercent != null && kpi.skillGapRatePercent >= 30}
      />
      <GrowthCard
        label="eL修了率"
        value={fmtPercent(kpi.elCompletionRatePercent)}
        sub="全割当に対する修了"
        href={APP_ROUTES.TENANT.ADMIN_EL_ASSIGNMENTS}
      />
      <GrowthCard
        label="hr-kpi 詳細"
        value="→"
        sub="育成KPIを詳しく見る"
        href={APP_ROUTES.TENANT.ADMIN_HR_KPI}
      />
    </div>
  )
}
