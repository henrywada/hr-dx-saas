/** 助成金情報配信 ホーム ローディングスケルトン */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] animate-pulse space-y-4 px-4 py-5 sm:px-6">
      <div className="h-8 w-64 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="h-28 rounded-lg bg-slate-200" />
        <div className="h-28 rounded-lg bg-slate-200" />
      </div>
    </div>
  )
}
