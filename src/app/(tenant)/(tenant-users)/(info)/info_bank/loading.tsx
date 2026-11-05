/** 社内AI情報バンクのローディングスケルトン */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] animate-pulse space-y-4 px-4 py-5 sm:px-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-slate-200" />
      </div>
      <div className="h-40 rounded-lg border border-slate-200 bg-white" />
    </div>
  )
}
