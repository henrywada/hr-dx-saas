import { AlertHighlightPanel } from './AlertHighlightPanel'
import { KpiHeadlineSection } from './KpiHeadlineSection'
import { ExportButton } from './ExportButton'
import type { ExecutiveSummaryData } from '../types'

interface Props {
  summary: ExecutiveSummaryData
}

export function ExecutiveSummaryDashboard({ summary }: Props) {
  const [year, month] = summary.yearMonth.split('-').map(Number)
  const periodLabel = `${year}年${month}月`
  const fetchedLabel = new Date(summary.fetchedAt).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              経営者向け統合エグゼクティブサマリー
            </h1>
            <p className="mt-0.5 text-sm text-gray-600">
              集計基準：{periodLabel}　　取得日時：{fetchedLabel}
            </p>
          </div>
          <ExportButton summary={summary} />
        </div>

        <div className="space-y-8 p-6">
          <AlertHighlightPanel highlights={summary.highlights} />
          <KpiHeadlineSection kpiHeadlines={summary.kpiHeadlines} />
        </div>
      </div>
    </div>
  )
}
