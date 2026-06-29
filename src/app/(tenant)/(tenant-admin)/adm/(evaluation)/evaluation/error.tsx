'use client'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function EvaluationListError({ error, reset }: Props) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-200 bg-red-50 px-6 py-5">
            <h1 className="text-lg font-bold text-red-700">評価シート一覧の取得に失敗しました</h1>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600">{error.message}</p>
            <button
              onClick={reset}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
