'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-gray-500 text-sm">コースの読み込みに失敗しました。</p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    </div>
  )
}
