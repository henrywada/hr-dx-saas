export default function Loading() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="flex gap-6 h-[calc(100vh-200px)]">
        <div className="w-64 flex-shrink-0 space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="flex-1 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}
