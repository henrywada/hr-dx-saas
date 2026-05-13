export default function Loading() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-16 bg-gray-100 rounded" />
        <div className="h-16 bg-gray-100 rounded" />
      </div>
    </div>
  )
}
