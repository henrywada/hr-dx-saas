'use client'

import { Download } from 'lucide-react'
import { downloadCsv } from '@/lib/csv'
import { bundleToCsvRows } from '../csv-utils'
import type { HrKpiBundle } from '../types'

interface Props {
  bundle: HrKpiBundle
}

export function ExportButton({ bundle }: Props) {
  const handleExport = () => {
    downloadCsv(`hr-kpi-${bundle.yearMonth}.csv`, bundleToCsvRows(bundle))
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
    >
      <Download size={14} />
      CSVエクスポート
    </button>
  )
}
