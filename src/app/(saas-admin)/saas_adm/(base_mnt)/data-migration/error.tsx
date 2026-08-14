'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function DataMigrationError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Data migration page error:', error)
  }, [error])

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="mb-2 text-lg font-bold text-slate-900">
        データ移行画面の読み込みに失敗しました
      </h2>
      <p className="mb-6 max-w-md text-center text-sm text-slate-500">
        {error.message || '予期せぬエラーが発生しました。しばらく経ってから再度お試しください。'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white"
      >
        再試行
      </button>
    </div>
  )
}
