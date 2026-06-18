'use client'

import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function JobBrandingError({ error, reset }: Props) {
  useEffect(() => {
    console.error('JobBrandingPage error:', error)
  }, [error])

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <div className="mb-4 text-4xl">⚠</div>
        <h2 className="mb-2 text-xl font-bold text-gray-900">
          採用ブランディングの読み込みに失敗しました
        </h2>
        <p className="mb-6 text-sm text-gray-500">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          再読み込み
        </button>
      </div>
    </div>
  )
}
