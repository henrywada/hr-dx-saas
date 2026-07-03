export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-400" />
        </div>
        <div className="space-y-8 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
