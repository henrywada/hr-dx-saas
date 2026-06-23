'use client'

import { useEffect } from 'react'

/** 推薦詳細ページ エラーバウンダリ */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-64 p-6 text-center">
      <p className="text-4xl mb-4">⚠</p>
      <h2 className="text-lg font-semibold text-slate-700 mb-2">エラーが発生しました</h2>
      <p className="text-sm text-slate-500 mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90"
      >
        再読み込み
      </button>
    </div>
  )
}
