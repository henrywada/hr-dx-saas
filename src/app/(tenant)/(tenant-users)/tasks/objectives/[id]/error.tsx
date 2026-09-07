'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6">
      <p className="text-xs text-red-600">目標の読み込みに失敗しました: {error.message}</p>
      <button onClick={reset} className="mt-2 text-xs text-[#FD7601] underline">
        再読み込み
      </button>
    </div>
  )
}
