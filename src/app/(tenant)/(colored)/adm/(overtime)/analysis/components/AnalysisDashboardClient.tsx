'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { addMonthsToYearMonth, parseYearMonthQuery } from '@/lib/year-month-query'
import { DepartmentRankingTable } from './DepartmentRankingTable'
import { GapAnalysisTable } from './GapAnalysisTable'
import { KpiCards } from './KpiCards'
import { OvertimeGauge } from './OvertimeGauge'
import { OvertimeTrendChart } from './OvertimeTrendChart'
import { RiskEmployeeTable } from './RiskEmployeeTable'

type AnalysisDashboardClientProps = {
  initialYearMonth: string
}

export function AnalysisDashboardClient({ initialYearMonth }: AnalysisDashboardClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const raw = searchParams.get('year_month')
  const yearMonth = raw != null && raw !== '' ? parseYearMonthQuery(raw) : initialYearMonth

  const goMonth = (ym: string) => {
    router.replace(`${pathname}?year_month=${encodeURIComponent(ym)}`, { scroll: false })
  }

  const label = format(parseISO(yearMonth), 'yyyy年M月', { locale: ja })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="!px-2"
          aria-label="前月"
          onClick={() => goMonth(addMonthsToYearMonth(yearMonth, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[7rem] text-center text-sm font-semibold text-slate-800">{label}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="!px-2"
          aria-label="翌月"
          onClick={() => goMonth(addMonthsToYearMonth(yearMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <KpiCards yearMonth={yearMonth} />
      <OvertimeGauge yearMonth={yearMonth} />
      <OvertimeTrendChart yearMonth={yearMonth} />
      <DepartmentRankingTable yearMonth={yearMonth} />
      <RiskEmployeeTable yearMonth={yearMonth} />
      <GapAnalysisTable yearMonth={yearMonth} />
    </div>
  )
}
