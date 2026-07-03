import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { KpiSummaryCard } from '@/features/hr-kpi/components/KpiSummaryCard'
import { APP_ROUTES } from '@/config/routes'
import type { ExecutiveKpiHeadline } from '../types'

interface KpiHeadlineSectionProps {
  kpiHeadlines: ExecutiveKpiHeadline[]
}

function formatValue(value: number | null): string {
  return value === null ? '—' : `${value}`
}

/** 横断KPIダッシュボードの主要指標を5〜6個だけ抜粋表示する（詳細はhr-kpiへ誘導） */
export function KpiHeadlineSection({ kpiHeadlines }: KpiHeadlineSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#161b22]">横断KPI要点</h2>
          <p className="text-xs text-[#57606a]">
            採用・定着・生産性・エンゲージメント・育成の全指標は横断KPIダッシュボードで確認できます。
          </p>
        </div>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_HR_KPI}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#FD7601] hover:underline"
        >
          横断KPIダッシュボードを見る
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiHeadlines.map(k => (
          <KpiSummaryCard
            key={k.label}
            label={k.label}
            value={formatValue(k.value)}
            sub={k.value === null ? undefined : k.unit}
            align="right"
          />
        ))}
      </div>
    </section>
  )
}
