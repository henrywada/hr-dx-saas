'use client'

import { Trophy } from 'lucide-react'

interface Props {
  courseTitle: string
  onClose: () => void
}

export function CourseCompletionBanner({ courseTitle, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">
            コース修了
          </p>
          <h2 className="text-xl font-bold text-gray-800 leading-snug">{courseTitle}</h2>
          <p className="text-sm text-gray-500 mt-2">おめでとうございます！コースを完了しました。</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          コース一覧へ戻る
        </button>
      </div>
    </div>
  )
}
