'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <div className="p-3 bg-red-100 rounded-full">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold text-slate-800">データの読み込みに失敗しました</h2>
        <p className="text-sm text-slate-500 mt-1">{error.message}</p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
      >
        <RefreshCw className="w-4 h-4" />
        再試行
      </button>
    </div>
  )
}
