'use client'

import { Download } from 'lucide-react'
import { downloadCsv } from '@/lib/csv'

type Props = {
  data: string[][]
  filename: string
  label?: string
}

export function CSVDownloadButton({ data, filename, label = 'CSV' }: Props) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, data)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
    >
      <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </button>
  )
}
