/** 情報バンク資料管理のローディングスケルトン */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1920px] animate-pulse space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-slate-200" />
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="h-9 border-b border-slate-200 bg-slate-100" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-slate-100 last:border-b-0" />
        ))}
      </div>
    </div>
  )
}
