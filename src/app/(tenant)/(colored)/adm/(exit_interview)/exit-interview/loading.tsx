export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-6 bg-slate-200 rounded w-40" />
        <div className="h-4 bg-slate-100 rounded w-56" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-80 bg-slate-100 rounded-xl" />
        <div className="h-80 bg-slate-100 rounded-xl" />
      </div>
      <div className="h-48 bg-slate-100 rounded-xl" />
    </div>
  )
}
