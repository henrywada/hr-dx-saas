/** 情報掲示板のローディングスケルトン（ラジオ 3 枠 + テーブル行） */
export function NotionInfoBoardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1920px] animate-pulse space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg border border-slate-200 bg-slate-100" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="h-9 border-b border-slate-200 bg-slate-100" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 border-b border-slate-100 last:border-b-0">
            <div className="flex h-full items-center gap-4 px-4">
              <div className="h-3 w-20 rounded bg-slate-200" />
              <div className="h-3 w-48 rounded bg-slate-200" />
              <div className="h-3 flex-1 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Loading() {
  return <NotionInfoBoardSkeleton />
}
