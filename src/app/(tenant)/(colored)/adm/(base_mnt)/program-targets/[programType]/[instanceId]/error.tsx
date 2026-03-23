'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function ProgramTargetDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('ProgramTargetDetailError:', error)
  }, [error])

  return (
    <div className="p-6 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          対象者詳細の読み込みに失敗しました
        </h2>
        <p className="text-sm text-slate-600 mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          再試行
        </button>
      </div>
    </div>
  )
}
