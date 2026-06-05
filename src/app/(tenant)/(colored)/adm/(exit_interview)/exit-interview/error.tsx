'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <p className="text-slate-600 text-sm">
        データの取得に失敗しました。しばらく待ってから再試行してください。
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white text-sm rounded-xl hover:bg-primary/90"
      >
        再読み込み
      </button>
    </div>
  )
}
