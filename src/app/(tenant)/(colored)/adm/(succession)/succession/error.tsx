'use client'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function SuccessionError({ error, reset }: Props) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="p-8 text-center">
          <p className="text-sm font-medium text-red-600">エラーが発生しました</p>
          <p className="mt-1 text-sm text-gray-500">{error.message}</p>
          <button
            onClick={reset}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
