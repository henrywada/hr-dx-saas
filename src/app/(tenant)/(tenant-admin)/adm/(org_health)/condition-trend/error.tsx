'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-4 sm:px-6 py-5 text-xs text-red-600">
      エラーが発生しました。
      <button onClick={reset} className="ml-2 underline">
        再試行
      </button>
    </div>
  )
}
