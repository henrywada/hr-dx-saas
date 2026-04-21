'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { removeAssignment } from '../actions'
import { COURSE_STATUS_LABELS } from '../constants'
import { AssignmentModal } from './AssignmentModal'
import type { ElAssignment } from '../types'

interface Employee {
  id: string
  name: string
  division_id: string | null
}

interface Props {
  assignments: ElAssignment[]
  employees: Employee[]
}

export function AssignmentListClient({ assignments, employees }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

  const handleRemove = (id: string) => {
    if (!confirm('アサインを解除しますか？')) return
    startTransition(() => removeAssignment(id))
  }

  const openAssign = (courseId: string) => {
    setSelectedCourseId(courseId)
    setShowModal(true)
  }

  const grouped = assignments.reduce<Record<string, ElAssignment[]>>((acc, a) => {
    const key = a.course_id
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Users className="w-10 h-10 mb-3" />
          <p className="text-sm">受講割り当てがありません</p>
          <p className="text-xs mt-1">コース管理ページからアサインできます</p>
        </div>
      ) : (
        Object.entries(grouped).map(([courseId, list]) => {
          const course = list[0].course
          return (
            <div
              key={courseId}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {course?.title ?? courseId}
                  </h3>
                  {course?.status && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {COURSE_STATUS_LABELS[course.status as keyof typeof COURSE_STATUS_LABELS]}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openAssign(courseId)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  受講者を追加
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {list.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                        {a.employee?.name?.[0] ?? '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {a.employee?.name ?? a.employee_id}
                        </p>
                        {a.due_date && <p className="text-xs text-gray-400">期限: {a.due_date}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(a.id)}
                      disabled={isPending}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {showModal && selectedCourseId && (
        <AssignmentModal
          courseId={selectedCourseId}
          employees={employees}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
