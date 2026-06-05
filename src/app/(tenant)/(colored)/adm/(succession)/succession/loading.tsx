export default function SuccessionLoading() {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-10 animate-pulse bg-gray-100" />
        <div className="h-24 animate-pulse bg-gray-200" />
        <div className="space-y-4 p-6">
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="h-8 w-72 animate-pulse rounded bg-gray-100" />
          <div className="h-96 animate-pulse rounded-xl bg-gray-50" />
        </div>
      </div>
    </div>
  )
}
