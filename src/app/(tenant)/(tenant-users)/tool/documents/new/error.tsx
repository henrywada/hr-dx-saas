'use client'

// 文書撮影画面のエラー境界
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="capture-form-shell -mx-[24px] flex w-[calc(100%+48px)] min-w-0 flex-col items-center gap-4 px-3 py-6 text-center md:mx-auto md:w-full md:max-w-md md:px-6">
      <p className="text-sm text-gray-600">文書撮影画面の読み込みに失敗しました。</p>
      <p className="text-xs text-gray-400">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-primary/50"
      >
        再読み込み
      </button>
    </div>
  )
}
