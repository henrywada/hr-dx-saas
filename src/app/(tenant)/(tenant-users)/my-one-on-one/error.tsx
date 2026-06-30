'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-red-600">1on1 履歴の読み込みに失敗しました</p>
      <p className="text-xs text-gray-500">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
      >
        再試行
      </button>
    </div>
  )
}
