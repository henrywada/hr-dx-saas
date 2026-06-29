export default function EvaluationSheetLoading() {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="animate-pulse border-b border-gray-200 px-6 py-4">
            <div className="h-6 w-64 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-40 rounded bg-gray-100" />
          </div>
          <div className="space-y-4 p-6">
            <div className="h-20 rounded-lg bg-gray-100" />
            <div className="h-64 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
