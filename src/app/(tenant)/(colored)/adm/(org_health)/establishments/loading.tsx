export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="pl-5">
        <div className="h-8 w-72 bg-gray-200 rounded-lg" />
        <div className="h-4 w-96 bg-gray-100 rounded mt-2" />
      </div>
      <div className="h-40 bg-gray-100 rounded-2xl" />
      <div className="h-64 bg-gray-50 rounded-2xl" />
    </div>
  )
}
