import { AlertTriangle } from 'lucide-react'
import type { ElAssignment } from '../types'
import type { AssignmentProgress } from '../queries'
import { isAssignmentOverdue } from '../assignment-utils'

interface Props {
  assignments: ElAssignment[]
  progressMap: Record<string, AssignmentProgress>
}

/** 期限超過の受講割当アラート（EL-S1） */
export function OverdueAssignmentAlertPanel({ assignments, progressMap }: Props) {
  const overdue = assignments.filter(a => {
    const p = progressMap[a.id]
    return isAssignmentOverdue(a.due_date, p?.isCompleted ?? false)
  })

  if (overdue.length === 0) return null

  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">
            期限超過の受講割当が {overdue.length} 件あります
          </p>
          <ul className="mt-2 space-y-1 text-xs text-red-700">
            {overdue.slice(0, 5).map(a => (
              <li key={a.id}>
                {a.employee?.name ?? '—'} — {a.course?.title ?? 'コース'}（期限: {a.due_date}）
              </li>
            ))}
            {overdue.length > 5 && (
              <li className="text-red-600">…他 {overdue.length - 5} 件</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
