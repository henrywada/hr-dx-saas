export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 rounded w-40" />
          <div className="h-4 bg-slate-100 rounded w-56" />
        </div>
        <div className="h-9 bg-slate-200 rounded-xl w-40" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="col-span-2 h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  )
}
