'use client'

import { useEffect } from 'react'

/** 助成金情報配信 エラーバウンダリ（配下の全画面で共有） */
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
    <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
      <p className="mb-4 text-4xl">⚠</p>
      <h2 className="mb-2 text-lg font-semibold text-slate-700">エラーが発生しました</h2>
      <p className="mb-6 text-sm text-slate-500">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-[#FD7601] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        再読み込み
      </button>
    </div>
  )
}
