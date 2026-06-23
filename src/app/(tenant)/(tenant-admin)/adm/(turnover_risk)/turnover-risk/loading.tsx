export default function Loading() {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5">
          <div className="h-4 w-48 animate-pulse rounded bg-gray-300" />
        </div>
        <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-400" />
        </div>
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
