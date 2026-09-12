'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { StalledTaskRow } from '../../queries'
import type { StalledReason } from '../../task-health'
import type { TaskStatus } from '../../types'

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

const REASON_LABEL: Record<StalledReason, string> = {
  overdue: '期限超過',
  stale: '長期未更新',
  blocked_long: '保留長期化',
}

const REASON_BADGE_CLASS: Record<StalledReason, string> = {
  overdue: 'bg-red-50 text-red-600',
  stale: 'bg-amber-50 text-amber-600',
  blocked_long: 'bg-slate-100 text-slate-600',
}

interface StalledTaskListCardProps {
  tasks: StalledTaskRow[]
}

function ReasonBadges({ reasons }: { reasons: StalledReason[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {reasons.map(reason => (
        <span
          key={reason}
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${REASON_BADGE_CLASS[reason]}`}
        >
          {REASON_LABEL[reason]}
        </span>
      ))}
    </div>
  )
}

const columns: Column<StalledTaskRow>[] = [
  { key: 'title', label: 'タスク名', sortable: true },
  {
    key: 'status',
    label: 'ステータス',
    render: (value: TaskStatus) => STATUS_LABEL[value],
  },
  { key: 'dueDate', label: '期限', render: (value: string | null) => value ?? '未設定' },
  {
    key: 'responsibleName',
    label: '責任者',
    render: (value: string | null) => value ?? '未設定',
  },
  {
    key: 'reasons',
    label: '滞留理由',
    render: (value: StalledReason[]) => <ReasonBadges reasons={value} />,
  },
]

/** 滞留タスク（期限超過・長期未更新・保留長期化）の一覧カード */
export function StalledTaskListCard({ tasks }: StalledTaskListCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">滞留タスク（{tasks.length}件）</h2>
      <div className="mt-3">
        {tasks.length === 0 ? (
          <p className="text-xs text-slate-500">滞留しているタスクはありません。</p>
        ) : (
          <DataTable
            columns={columns}
            data={tasks}
            getRowId={t => t.id}
            searchable
            searchKey="title"
            searchPlaceholder="タスク名で検索..."
          />
        )}
      </div>
    </div>
  )
}
