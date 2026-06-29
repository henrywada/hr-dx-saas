'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Users } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { removeAssignment } from '../actions'
import { AssignmentModal } from './AssignmentModal'
import type { ElAssignment, ElCourse } from '../types'
import type { AssignmentProgress } from '../queries'

interface Employee {
  id: string
  name: string
  division_id: string | null
}

interface Props {
  assignments: ElAssignment[]
  employees: Employee[]
  tenantCourses: ElCourse[]
  progressMap?: Record<string, AssignmentProgress>
}

export function AssignmentListClient({
  assignments,
  employees,
  tenantCourses,
  progressMap = {},
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showModal, setShowModal] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleRemove = (id: string) => {
    if (!confirm('アサインを解除しますか？')) return
    startTransition(async () => {
      await removeAssignment(id)
      router.refresh()
    })
  }

  const openAssign = (courseId: string) => {
    setSelectedCourseId(courseId)
    setShowModal(true)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    if (!confirm(`${selectedIds.size}件のアサインを削除しますか？`)) return
    startTransition(async () => {
      for (const id of selectedIds) {
        await removeAssignment(id)
      }
      router.refresh()
    })
  }

  const columns: Column<ElAssignment>[] = [
    {
      key: 'employee_id' as keyof ElAssignment,
      label: 'ユーザー名',
      sortable: true,
      render: (_, item) => (
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#f6f8fa] flex items-center justify-center text-xs font-medium text-[#57606a] flex-shrink-0">
            {item.employee?.name?.[0] ?? '?'}
          </div>
          <p className="text-sm font-medium text-[#24292f]">
            {item.employee?.name ?? item.employee_id}
          </p>
        </div>
      ),
    },
    {
      key: 'course_id' as keyof ElAssignment,
      label: 'コース',
      render: (_, item) => (
        <div className="text-sm font-medium text-[#24292f]">
          {item.course?.title ?? item.course_id}
        </div>
      ),
    },
    {
      key: 'due_date' as keyof ElAssignment,
      label: '期限',
      render: (_, item) => <div className="text-sm text-[#57606a]">{item.due_date ?? '-'}</div>,
    },
    {
      key: 'tenant_id' as keyof ElAssignment,
      label: '進捗',
      width: 'w-40',
      render: (_, item) => {
        const p = progressMap[item.id]
        if (!p || p.total === 0) {
          return <div className="text-xs text-gray-400">スライド未登録</div>
        }
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-[#eaeef2] overflow-hidden">
              <div
                className={`h-full rounded-full ${p.isCompleted ? 'bg-emerald-500' : 'bg-[#FD7601]'}`}
                style={{ width: `${p.rate}%` }}
              />
            </div>
            <span className="text-xs text-[#57606a] tabular-nums">
              {p.completed}/{p.total}（{p.rate}%）
            </span>
          </div>
        )
      },
    },
    {
      key: 'assigned_at' as keyof ElAssignment,
      label: '状態',
      width: 'w-24',
      render: (_, item) => {
        const p = progressMap[item.id]
        if (!p || p.total === 0) {
          return <span className="text-xs text-gray-400">-</span>
        }
        if (p.isCompleted) {
          return (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              修了
            </span>
          )
        }
        if (p.completed > 0) {
          return (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              受講中
            </span>
          )
        }
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            未着手
          </span>
        )
      },
    },
    {
      key: 'id' as keyof ElAssignment,
      label: '操作',
      width: 'w-12',
      render: (_, item) => (
        <button
          onClick={() => handleRemove(item.id)}
          disabled={isPending}
          className="text-red-500 hover:text-red-700 disabled:opacity-30 inline-flex"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center py-10 text-gray-400">
          <Users className="w-10 h-10 mb-3" />
          <p className="text-sm text-gray-600">まだ受講割り当てがありません</p>
          <p className="text-xs mt-2 text-center text-gray-500 max-w-md">
            下のコース一覧から選び、受講者を指定してください。
            <br />
            ステータスが「下書き」でも割り当ては可能ですが、受講開始前に
            <Link
              href={APP_ROUTES.TENANT.ADMIN_EL_COURSES}
              className="text-[#FD7601] hover:underline mx-0.5"
            >
              コース管理
            </Link>
            で「公開中」にすると運用しやすくなります。
          </p>
        </div>

        {tenantCourses.length === 0 ? (
          <div className="text-center text-sm text-gray-500">
            自社コースがありません。
            <Link
              href={APP_ROUTES.TENANT.ADMIN_EL_COURSES}
              className="text-[#FD7601] hover:underline ml-1"
            >
              コースを作成
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#e2e6ec] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#e2e6ec]">
              <h2 className="text-sm font-semibold text-gray-800">コースを選んで割り当て</h2>
            </div>
            <ul className="divide-y divide-[#e2e6ec]">
              {tenantCourses.map(course => {
                const disabled = course.status === 'archived'
                return (
                  <li
                    key={course.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#f6f8fa] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{course.title}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-xs text-gray-500">{course.category}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => !disabled && openAssign(course.id)}
                      disabled={disabled}
                      className="flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#FD7601] hover:bg-orange-700 rounded-lg disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      割り当て
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => openAssign(tenantCourses[0]?.id || '')}
          disabled={tenantCourses.length === 0}
          className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-[#FD7601] hover:bg-orange-700 rounded-lg disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          新規割り当て
        </button>
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        searchable
        searchPlaceholder="ユーザー名で検索..."
        searchKey="employee_id"
        selectable
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        getRowId={item => item.id}
      />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-4 bg-[#FD7601] bg-opacity-10 border border-[#FD7601] rounded-lg">
          <p className="text-sm font-medium text-[#FD7601]">{selectedIds.size} 件を選択</p>
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="ml-auto px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
          >
            選択項目を削除
          </button>
        </div>
      )}

      {showModal && selectedCourseId && (
        <AssignmentModal
          courseId={selectedCourseId}
          employees={employees}
          onClose={() => setShowModal(false)}
          onAssigned={() => router.refresh()}
        />
      )}
    </div>
  )
}
