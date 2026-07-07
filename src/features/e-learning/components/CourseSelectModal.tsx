'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { COURSE_STATUS_LABELS } from '../constants'
import { formatPublicationRangeJa } from '../publication-window'
import type { ElCourse } from '../types'

interface Props {
  courses: ElCourse[]
  assignmentCountByCourseId: Record<string, number>
  onSelect: (courseId: string) => void
  onClose: () => void
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700',
}

/** 新規割り当て時にコースを選ぶモーダル（一覧テーブル） */
export function CourseSelectModal({
  courses,
  assignmentCountByCourseId,
  onSelect,
  onClose,
}: Props) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const assignableCourses = useMemo(() => courses.filter(c => c.status !== 'archived'), [courses])

  const selectedCourse = assignableCourses.find(c => c.id === selectedCourseId) ?? null

  const handleContinue = () => {
    if (!selectedCourseId) return
    onSelect(selectedCourseId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">コースを選択</h2>
            <p className="text-xs text-gray-500 mt-0.5">割り当てるコースを選んでください</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {assignableCourses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              割り当て可能なコースがありません（アーカイブ済みのみの場合はコース管理で確認してください）
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#e2e6ec]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e2e6ec] bg-[#f6f8fa] text-left text-xs text-[#57606a]">
                    <th className="px-4 py-2 font-medium w-10" aria-label="選択" />
                    <th className="px-4 py-2 font-medium">カテゴリ</th>
                    <th className="px-4 py-2 font-medium">コース名</th>
                    <th className="px-4 py-2 font-medium">ステータス</th>
                    <th className="px-4 py-2 font-medium text-right">割当数</th>
                    <th className="px-4 py-2 font-medium">公開時期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e6ec]">
                  {assignableCourses.map(course => {
                    const isSelected = selectedCourseId === course.id
                    const publication = formatPublicationRangeJa(course)
                    return (
                      <tr
                        key={course.id}
                        onClick={() => setSelectedCourseId(course.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-orange-50 hover:bg-orange-50' : 'hover:bg-[#f6f8fa]'
                        }`}
                      >
                        <td className="px-4 py-2">
                          <input
                            type="radio"
                            name="course-select"
                            checked={isSelected}
                            onChange={() => setSelectedCourseId(course.id)}
                            className="accent-[#FD7601]"
                            aria-label={`${course.title} を選択`}
                          />
                        </td>
                        <td className="px-4 py-2 text-[#57606a]">{course.category || '—'}</td>
                        <td className="px-4 py-2 font-medium text-[#24292f]">{course.title}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_COLORS[course.status] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {COURSE_STATUS_LABELS[course.status]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-[#24292f]">
                          {assignmentCountByCourseId[course.id] ?? 0}
                        </td>
                        <td className="px-4 py-2 text-[#57606a] text-xs">{publication ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t">
          <p className="text-xs text-gray-500 truncate min-w-0">
            {selectedCourse ? `選択中: ${selectedCourse.title}` : 'コースを選択してください'}
          </p>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
            <button
              onClick={handleContinue}
              disabled={!selectedCourseId}
              className="px-5 py-2 text-sm font-medium text-white bg-[#FD7601] hover:bg-orange-700 rounded-lg disabled:opacity-40"
            >
              受講者を選ぶ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
