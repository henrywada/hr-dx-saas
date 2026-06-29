import Link from 'next/link'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import { canManageLifecycle } from '../types'
import type { PendingTaskRow } from '../types'

type Props = {
  pending: PendingTaskRow[]
  appRole: string | null | undefined
}

const LIFECYCLE_TYPE_LABEL: Record<PendingTaskRow['lifecycle_type'], string> = {
  onboarding: '入社フロー',
  offboarding: '退社フロー',
}

export function PendingLifecycleTaskNoticeCards({ pending, appRole }: Props) {
  if (pending.length === 0) return null

  const canManage = canManageLifecycle(appRole)

  return (
    <ul className="divide-y divide-[#ebebeb]">
      {pending.map(task => {
        const content = (
          <div className="flex items-start gap-3 p-4 sm:px-5 outline-none focus:bg-[#f6f8fa]">
            <div
              className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                task.is_overdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-[#24292f]">{task.title}</p>
              <p className="text-xs text-[#57606a]">
                {LIFECYCLE_TYPE_LABEL[task.lifecycle_type]}・{task.instance_employee_name}
                {task.due_date && (
                  <span className={task.is_overdue ? 'text-red-600 font-semibold' : ''}>
                    {' '}
                    / 期限: {task.due_date}
                    {task.is_overdue ? '（期限超過）' : ''}
                  </span>
                )}
              </p>
            </div>
            {canManage && (
              <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-[#57606a] group-hover:text-sky-600 transition-colors mt-0.5">
                確認する
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </div>
        )

        return (
          <li key={task.task_id} className="group hover:bg-[#f6f8fa]/80 transition-colors">
            {canManage ? <Link href={APP_ROUTES.TENANT.ADMIN_LIFECYCLE}>{content}</Link> : content}
          </li>
        )
      })}
    </ul>
  )
}
