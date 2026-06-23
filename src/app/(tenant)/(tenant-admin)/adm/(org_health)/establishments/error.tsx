'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-8 max-w-lg mx-auto text-center space-y-4">
      <h2 className="text-lg font-bold text-slate-900">拠点設定の読み込みに失敗しました</h2>
      <p className="text-sm text-slate-600">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
      >
        再試行
      </button>
    </div>
  )
}
