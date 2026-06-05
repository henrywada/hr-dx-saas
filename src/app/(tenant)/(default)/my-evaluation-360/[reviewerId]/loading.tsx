export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-24 bg-slate-100 rounded-xl" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-32 bg-slate-100 rounded-xl" />
      ))}
    </div>
  )
}
