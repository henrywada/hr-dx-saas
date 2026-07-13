'use client'

import { useState } from 'react'
import { BookOpen, Clock, Calendar, ChevronRight } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { ElAssignment, ElCourse, ElSlideProgress } from '../types'
import { formatPublicationRangeJa, canAccessCourseViewer } from '../publication-window'

type AssignmentWithDetail = ElAssignment & {
  completed_at: string | null
  course: ElCourse
  progress: ElSlideProgress[]
}

interface Props {
  assignments: AssignmentWithDetail[]
  totalSlidesMap: Record<string, number>
  requirementCountMap: Record<string, number>
}

type Tab = 'all' | 'not_started' | 'in_progress' | 'completed'

const TAB_LABELS: Record<Tab, string> = {
  all: 'すべて',
  not_started: '未開始',
  in_progress: '受講中',
  completed: '修了済み',
}

function getStatus(a: AssignmentWithDetail): 'not_started' | 'in_progress' | 'completed' {
  if (a.completed_at) return 'completed'
  if (a.progress.length > 0) return 'in_progress'
  return 'not_started'
}

const STATUS_BADGE: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-[#FD7601]-10 text-[#FD7601]',
  completed: 'bg-green-100 text-green-700',
}
const STATUS_LABEL: Record<string, string> = {
  not_started: '未開始',
  in_progress: '受講中',
  completed: '修了',
}
const BUTTON_LABEL: Record<string, string> = {
  not_started: '開始する',
  in_progress: '続きから',
  completed: '復習する',
}

export function MyCourseListClient({ assignments, totalSlidesMap, requirementCountMap }: Props) {
  const [tab, setTab] = useState<Tab>('all')

  const filtered = tab === 'all' ? assignments : assignments.filter(a => getStatus(a) === tab)

  const formatDate = (d: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
  }

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'completed') return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-4">
      {/* ステータスタブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 max-w-xl">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <BookOpen className="w-10 h-10 mb-3" />
          <p className="text-sm">コースがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(a => {
            const status = getStatus(a)
            const total = totalSlidesMap[a.course_id] ?? 0
            const completedCount = a.progress.filter(p => p.status === 'completed').length
            const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100)
            const overdue = isOverdue(a.due_date, status)
            const pubRange = formatPublicationRangeJa(a.course)
            const canOpen = canAccessCourseViewer(a.course, a.completed_at ?? null)
            const outerClass = `block bg-white border border-gray-200 rounded-xl p-4 transition-shadow ${
              canOpen ? 'hover:shadow-md' : 'opacity-70 cursor-not-allowed'
            }`

            const inner = (
              <>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#f6f8fa] text-[#FD7601] font-medium">
                      {a.course.category}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[status]}`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                    {pubRange && (
                      <span className="text-xs text-gray-500 font-normal">{pubRange}</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                </div>

                <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">
                  {a.course.title}
                </h3>

                {a.course.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{a.course.description}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  {a.course.estimated_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />約{a.course.estimated_minutes}分
                    </span>
                  )}
                  {a.due_date && (
                    <span
                      className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      期限: {formatDate(a.due_date)}
                      {overdue && ' (期限超過)'}
                    </span>
                  )}
                </div>

                {total > 0 && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          status === 'completed' ? 'bg-green-500' : 'bg-[#f6f8fa]0'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-right">
                      {completedCount} / {total} スライド完了
                    </p>
                  </div>
                )}

                {status === 'completed' && (requirementCountMap[a.course_id] ?? 0) > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      eL
                    </span>
                    <span className="text-xs text-emerald-700">
                      スキル要件 {requirementCountMap[a.course_id]} 件に自動反映
                    </span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100">
                  {!canOpen ? (
                    <span className="text-xs font-medium text-amber-700">
                      現在はこのコースを受講できません（公開期間外）
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-semibold ${
                        status === 'completed' ? 'text-green-600' : 'text-[#FD7601]'
                      }`}
                    >
                      {BUTTON_LABEL[status]} →
                    </span>
                  )}
                </div>
              </>
            )

            return canOpen ? (
              <a
                key={a.id}
                href={APP_ROUTES.TENANT.EL_MY_COURSE_VIEWER(a.id)}
                className={outerClass}
              >
                {inner}
              </a>
            ) : (
              <div key={a.id} className={outerClass}>
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
