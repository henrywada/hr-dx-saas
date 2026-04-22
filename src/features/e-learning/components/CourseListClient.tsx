'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Copy, Pencil, Trash2, BookOpen } from 'lucide-react'
import { deleteCourse, copyTemplateToTenant, updateCourse } from '../actions'
import { COURSE_STATUS_LABELS } from '../constants'
import { CourseFormModal } from './CourseFormModal'
import type { CourseStatus, ElCourse } from '../types'

interface Props {
  tenantCourses: ElCourse[]
  templateCourses: ElCourse[]
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

const COURSE_STATUS_OPTIONS: CourseStatus[] = ['draft', 'published', 'archived']

export function CourseListClient({ tenantCourses, templateCourses }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'tenant' | 'template'>('tenant')
  const [showForm, setShowForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')

  const courses = tab === 'tenant' ? tenantCourses : templateCourses
  const categories = Array.from(new Set(courses.map(c => c.category).filter(Boolean))).sort()
  const filtered = filterCategory ? courses.filter(c => c.category === filterCategory) : courses

  const handleDelete = (id: string) => {
    if (!confirm('このコースを削除しますか？スライドも含めて削除されます。')) return
    startTransition(async () => {
      await deleteCourse(id)
    })
  }

  const handleCopy = (templateId: string) => {
    startTransition(async () => {
      await copyTemplateToTenant(templateId)
    })
  }

  const handleCourseStatusChange = (courseId: string, status: CourseStatus) => {
    startTransition(async () => {
      await updateCourse(courseId, { status })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* タブ */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {(['tenant', 'template'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'tenant' ? '自社コース' : 'テンプレートコース'}
            <span className="ml-2 text-xs text-gray-400">
              {(t === 'tenant' ? tenantCourses : templateCourses).length}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 pb-1">
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

          {tab === 'tenant' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              コース作成
            </button>
          )}
        </div>
      </div>

      {tab === 'template' && (
        <p className="text-sm text-gray-500 bg-blue-50 rounded-lg px-4 py-2.5">
          テンプレートコースを「コピー」すると、自社コースとして編集できます。
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mb-3" />
          <p className="text-sm">コースがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(course => (
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
                {tab === 'tenant' ? (
                  <select
                    aria-label="コースの公開ステータス"
                    value={course.status}
                    onChange={e =>
                      handleCourseStatusChange(course.id, e.target.value as CourseStatus)
                    }
                    disabled={isPending}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border border-transparent cursor-pointer max-w-36 ${STATUS_COLORS[course.status]}`}
                  >
                    {COURSE_STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>
                        {COURSE_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[course.status]}`}
                  >
                    {COURSE_STATUS_LABELS[course.status as keyof typeof COURSE_STATUS_LABELS]}
                  </span>
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

              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                {tab === 'template' ? (
                  <button
                    onClick={() => handleCopy(course.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    自社コースにコピー
                  </button>
                ) : (
                  <>
                    <a
                      href={`/adm/el-courses/${course.id}`}
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && <CourseFormModal courseType="tenant" onClose={() => setShowForm(false)} />}
    </div>
  )
}
