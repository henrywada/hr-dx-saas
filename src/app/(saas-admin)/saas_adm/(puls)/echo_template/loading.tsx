export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-9 w-32 bg-slate-200 rounded-lg animate-pulse" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex gap-8">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-12 bg-slate-200 rounded animate-pulse ml-auto" />
          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-5 py-4 border-b border-slate-100 flex items-center gap-4">
            <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-8 bg-slate-100 rounded animate-pulse ml-auto" />
            <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
            <div className="flex gap-2">
              <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
