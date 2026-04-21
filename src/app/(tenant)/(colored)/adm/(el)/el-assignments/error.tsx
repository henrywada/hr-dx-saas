'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-64 text-center">
      <p className="text-sm text-gray-600 mb-4">受講割り当ての読み込みに失敗しました</p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
      >
        再試行
      </button>
    </div>
  )
}
