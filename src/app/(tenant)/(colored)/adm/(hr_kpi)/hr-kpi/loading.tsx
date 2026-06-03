export default function HrKpiLoading() {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gray-200 border-b border-gray-300 px-6 py-5 flex items-center justify-between">
          <div>
            <div className="h-8 w-64 rounded bg-gray-300 animate-pulse" />
            <div className="mt-1.5 h-4 w-48 rounded bg-gray-300 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-gray-300 animate-pulse" />
        </div>
        <div className="p-6 space-y-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="mb-3 h-5 w-24 rounded bg-gray-200 animate-pulse" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div
                    key={j}
                    className="rounded-lg border border-gray-200 p-4 h-20 animate-pulse bg-gray-50"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
