export default function EvaluationListLoading() {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="animate-pulse border-b border-gray-200 px-6 py-4">
            <div className="h-6 w-48 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-100" />
          </div>
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
