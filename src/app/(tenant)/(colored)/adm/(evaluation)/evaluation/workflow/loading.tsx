export default function WorkflowLoading() {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="animate-pulse border-b border-gray-300 bg-gray-200 px-6 py-5">
            <div className="h-7 w-48 rounded bg-gray-300" />
            <div className="mt-2 h-4 w-72 rounded bg-gray-300" />
          </div>
          <div className="space-y-4 p-6">
            <div className="h-24 rounded-lg bg-gray-100" />
            <div className="h-64 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
