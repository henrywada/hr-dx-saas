'use client'

import { RecruitKpiSection } from './RecruitKpiSection'
import { RetentionKpiSection } from './RetentionKpiSection'
import { ProductivityKpiSection } from './ProductivityKpiSection'
import { EngagementKpiSection } from './EngagementKpiSection'
import { DevelopmentKpiSection } from './DevelopmentKpiSection'
import { ExportButton } from './ExportButton'
import type { HrKpiBundle } from '../types'

interface Props {
  bundle: HrKpiBundle
}

export function HrKpiDashboard({ bundle }: Props) {
  const [year, month] = bundle.yearMonth.split('-').map(Number)
  const periodLabel = `${year}年${month}月`
  const fetchedLabel = new Date(bundle.fetchedAt).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイルに準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* カードヘッダー */}
        <div className="bg-gray-200 border-b border-gray-300 px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              横断KPIダッシュボード
            </h1>
            <p className="mt-0.5 text-sm text-gray-600">
              集計基準：{periodLabel}　　取得日時：{fetchedLabel}
            </p>
          </div>
          <ExportButton bundle={bundle} />
        </div>

        {/* カード本文 */}
        <div className="p-6 space-y-8">
          <RecruitKpiSection kpi={bundle.recruit} />
          <RetentionKpiSection kpi={bundle.retention} />
          <ProductivityKpiSection kpi={bundle.productivity} />
          <EngagementKpiSection kpi={bundle.engagement} />
          <DevelopmentKpiSection kpi={bundle.development} />
        </div>
      </div>
    </div>
  )
}
