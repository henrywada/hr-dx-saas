export default function OneOnOneLoading() {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse">
        <div className="border-b border-gray-200 bg-gray-100 h-10" />
        <div className="border-b border-gray-200 bg-gray-200 h-20" />
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-100" />
          <div className="h-48 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
