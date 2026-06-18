'use client'

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RecruitFunnelError({ error, reset }: Props) {
  useEffect(() => {
    console.error('RecruitFunnelPage error:', error)
  }, [error])

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <div className="text-4xl mb-4">⚠</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          採用プロセスの読み込みに失敗しました
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          データの取得中にエラーが発生しました。再度お試しください。
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-colors"
        >
          再読み込み
        </button>
      </div>
    </div>
  )
}
