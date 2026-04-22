'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { deleteCourse } from '../actions'
import { COURSE_STATUS_LABELS } from '../constants'
import { formatPublicationRangeJa } from '../publication-window'
import { CourseFormModal } from './CourseFormModal'
import type { ElCourse } from '../types'

interface Props {
  courses: ElCourse[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700',
}

const CATEGORY_PALETTE = [
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-red-100 text-red-700',
  'bg-teal-100 text-teal-700',
]
const categoryColorCache: Record<string, string> = {}
function getCategoryColor(category: string): string {
  if (!categoryColorCache[category]) {
    const idx = Object.keys(categoryColorCache).length % CATEGORY_PALETTE.length
    categoryColorCache[category] = CATEGORY_PALETTE[idx]
  }
  return categoryColorCache[category]
}

export function TemplateCourseListClient({ courses }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [editCourse, setEditCourse] = useState<ElCourse | null>(null)
  const [filterCategory, setFilterCategory] = useState('')

  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean))).sort()
  const filtered = filterCategory ? courses.filter(c => c.category === filterCategory) : courses

  const handleDelete = (id: string) => {
    if (!confirm('このテンプレートを削除しますか？スライドも含めて削除されます。')) return
    startTransition(() => deleteCourse(id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 justify-end">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setEditCourse(null)
            setShowForm(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          テンプレート作成
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mb-3" />
          <p className="text-sm">テンプレートコースがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(course => {
            const pubRange = formatPublicationRangeJa(course)
            return (
            <div
              key={course.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(course.category)}`}
                >
                  {course.category}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[course.status]}`}
                >
                  {COURSE_STATUS_LABELS[course.status as keyof typeof COURSE_STATUS_LABELS]}
                </span>
                {pubRange && (
                  <span className="text-xs text-gray-600 self-center">{pubRange}</span>
                )}
              </div>

              <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">
                {course.title}
              </h3>
              {course.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{course.description}</p>
              )}
              {course.estimated_minutes && (
                <p className="text-xs text-gray-400">約{course.estimated_minutes}分</p>
              )}

              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setEditCourse(course)
                    setShowForm(true)
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg"
                >
                  タイトル・公開期間
                </button>
                <a
                  href={`/saas_adm/el-templates/${course.id}`}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  編集
                </a>
                <button
                  onClick={() => handleDelete(course.id)}
                  disabled={isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  削除
                </button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <CourseFormModal
          key={editCourse?.id ?? 'new'}
          course={editCourse ?? undefined}
          courseType="template"
          onClose={() => {
            setShowForm(false)
            setEditCourse(null)
          }}
        />
      )}
    </div>
  )
}
