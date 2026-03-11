'use client'

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 text-center bg-red-50 rounded-xl m-4 border border-red-200">
      <h2 className="text-xl font-bold text-red-700 mb-2">データの読み込みに失敗しました</h2>
      <p className="text-red-500 mb-4">{error.message}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
      >
        再試行
      </button>
    </div>
  )
}
