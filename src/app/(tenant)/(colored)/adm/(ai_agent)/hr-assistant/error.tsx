'use client'

export default function HrAssistantError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-[calc(100vh-64px)] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-slate-700 font-medium">AI人事相談アシスタントの読み込みに失敗しました。</p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          再読み込み
        </button>
      </div>
    </div>
  )
}
