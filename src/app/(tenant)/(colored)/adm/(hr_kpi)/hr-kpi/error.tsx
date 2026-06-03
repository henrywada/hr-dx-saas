'use client'

import { AlertTriangle } from 'lucide-react'

export default function HrKpiError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="text-red-500" size={40} />
      <div>
        <p className="text-lg font-semibold text-gray-800">KPIデータの読み込みに失敗しました</p>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
      >
        再読み込み
      </button>
    </div>
  )
}
