'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <p className="text-red-600">エラーが発生しました</p>
      <button onClick={reset} className="btn">
        再試行
      </button>
    </div>
  )
}
