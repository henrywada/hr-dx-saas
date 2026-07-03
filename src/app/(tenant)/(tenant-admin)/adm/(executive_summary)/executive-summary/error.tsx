'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-200 bg-red-50 px-6 py-5">
          <h2 className="text-lg font-bold text-red-700">エラーが発生しました</h2>
          <p className="mt-1 text-sm text-red-600">{error.message}</p>
        </div>
        <div className="p-6">
          <button
            onClick={reset}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
