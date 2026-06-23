export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-2 w-full bg-gray-200 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  )
}
