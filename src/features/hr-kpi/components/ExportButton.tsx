'use client'

import { Download } from 'lucide-react'
import { bundleToCsvRows } from '../queries'
import type { HrKpiBundle } from '../types'

interface Props {
  bundle: HrKpiBundle
}

export function ExportButton({ bundle }: Props) {
  const handleExport = () => {
    const rows = bundleToCsvRows(bundle)
    // BOM付きUTF-8でExcelが文字化けしないようにする
    const bom = '﻿'
    const csv = bom + rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hr-kpi-${bundle.yearMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
