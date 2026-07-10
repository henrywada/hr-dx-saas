export default function HrAssistantLoading() {
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center bg-[#f6f8fa]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span className="text-sm">読み込み中...</span>
      </div>
    </div>
  )
}
