'use client'

// Next.js App Router がエラー発生時に自動的に使用する。外部からは import されない。

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LifecycleError({ error, reset }: Props) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-200 bg-red-50 px-6 py-4">
          <h2 className="text-base font-semibold text-red-700">
            入退社ライフサイクルワークフローの読み込みに失敗しました
          </h2>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{error.message}</p>
          <button
            onClick={reset}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
