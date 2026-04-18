'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error.message}</p>
      <button onClick={reset} className="px-4 py-2 bg-primary text-white rounded">
        再試行
      </button>
    </div>
  )
}
