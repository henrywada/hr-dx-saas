'use client'

// TrainingTemplateManager の CourseListSection から import される

import { useState, useTransition } from 'react'
import { addCourseToTemplate } from '../training-plan-actions'

interface Props {
  templateId: string
  templateName: string
  availableCourses: { id: string; title: string; category: string }[]
  alreadyAddedCourseIds: string[]
  onClose: () => void
}

export function TrainingCoursePickerModal({
  templateId,
  templateName,
  availableCourses,
  alreadyAddedCourseIds,
  onClose,
}: Props) {
  const addedSet = new Set(alreadyAddedCourseIds)
  const candidates = availableCourses.filter(c => !addedSet.has(c.id))

  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = search.trim()
    ? candidates.filter(c => c.title.includes(search) || c.category.includes(search))
    : candidates

  const handleAdd = (courseId: string) => {
    startTransition(async () => {
      const result = await addCourseToTemplate(templateId, courseId)
      if (!result.success) setError(result.error ?? 'エラーが発生しました')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[80vh] flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">コースを追加</h2>
            <p className="text-xs text-gray-500 mt-0.5">{templateName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-3 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="コース名・カテゴリで絞り込み..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {candidates.length === 0 ? '追加可能なコースがありません' : '検索結果がありません'}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map(course => (
                <li
                  key={course.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                    <p className="text-xs text-gray-500">{course.category}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(course.id)}
                    disabled={isPending}
                    className="ml-3 flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    追加
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t border-gray-200 px-6 py-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
