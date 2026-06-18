export default function JobBrandingLoading() {
  return (
    <div className="mx-auto max-w-4xl p-6 animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="h-4 w-96 rounded bg-gray-100" />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex border-b border-gray-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 py-3 flex justify-center">
              <div className="h-4 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="h-4 w-80 rounded bg-gray-100" />
          <div className="h-24 rounded bg-gray-100" />
          <div className="h-24 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
