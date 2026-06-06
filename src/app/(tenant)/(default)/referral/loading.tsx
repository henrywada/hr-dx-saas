/** 社員紹介採用ページ ローディングスケルトン */
export default function Loading() {
  return (
    <div className="p-6 space-y-8 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-lg w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-slate-200 rounded-xl" />
        ))}
      </div>
      <div className="h-40 bg-slate-200 rounded-xl max-w-md" />
    </div>
  )
}
