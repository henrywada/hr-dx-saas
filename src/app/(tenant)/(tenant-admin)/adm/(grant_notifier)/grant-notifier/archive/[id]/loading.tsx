/** 助成金詳細 ローディングスケルトン */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] animate-pulse space-y-4 px-4 py-5 sm:px-6">
      <div className="h-8 w-80 rounded-lg bg-slate-200" />
      <div className="h-32 rounded-lg bg-slate-200" />
      <div className="h-64 rounded-lg bg-slate-200" />
    </div>
  )
}
