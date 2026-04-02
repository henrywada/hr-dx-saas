'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/Button'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'
import { addMonthsToYearMonth, parseYearMonthQuery } from '@/lib/year-month-query'
import { ANALYSIS_DASHBOARD_HELP_MARKDOWN } from './analysisDashboardHelpMarkdown'
import { DepartmentRankingTable } from './DepartmentRankingTable'
import { GapAnalysisTable } from './GapAnalysisTable'
import { OvertimeGauge } from './OvertimeGauge'
import { OvertimeTrendChart } from './OvertimeTrendChart'
import { RiskEmployeeTable } from './RiskEmployeeTable'

type AnalysisDashboardClientProps = {
  initialYearMonth: string
}

export function AnalysisDashboardClient({ initialYearMonth }: AnalysisDashboardClientProps) {
  const [helpOpen, setHelpOpen] = useState(false)
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
      <div className="grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-x-2">
        <h1 className="text-2xl font-bold text-gray-900 sm:justify-self-start">勤務状況分析</h1>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-self-center">
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
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 justify-self-start sm:justify-self-end"
          onClick={() => setHelpOpen(true)}
        >
          各カードの見方
        </Button>
      </div>

      <HelpMarkdownModal
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="勤務状況分析 各カードの見方"
        markdown={ANALYSIS_DASHBOARD_HELP_MARKDOWN}
        srDescription="勤務状況分析の各カードの説明です。時間外労働の上限規制の考え方の要約と出典（厚生労働省 PDF）を含みます。"
      />

      <OvertimeGauge yearMonth={yearMonth} />
      <OvertimeTrendChart yearMonth={yearMonth} />
      <DepartmentRankingTable yearMonth={yearMonth} />
      <RiskEmployeeTable yearMonth={yearMonth} />
      <GapAnalysisTable yearMonth={yearMonth} />
    </div>
  )
}
