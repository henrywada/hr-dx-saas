'use client'

import { ListTodo } from 'lucide-react'
import { toJSTDateString } from '@/lib/datetime'
import type { Task } from '../types'

interface SimpleTaskCardProps {
  task: Task
  employeeNameById: Record<string, string>
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}

/** 目標詳細ページのタスクカード（Phase5シンプルUI用）。 */
export function SimpleTaskCard({
  task,
  employeeNameById,
  canEdit,
  onEdit,
  onDelete,
}: SimpleTaskCardProps) {
  // 最終レビュー Finding 6: toISOString()はUTC基準になるため、JST 0:00〜8:59台は
  // 前日の日付で比較してしまい、期限超過の反映が最大9時間遅れる。JST基準の「今日」で比較する
  // （CLAUDE.mdの「Supabaseへの日時書き込みはAsia/Tokyoで行う」規約、WorkLogSection.tsxと同じ意図）。
  const isOverdue = task.dueDate !== null && task.dueDate < toJSTDateString()
  const responsibleName = task.responsibleEmployeeId
    ? (employeeNameById[task.responsibleEmployeeId] ?? task.responsibleEmployeeId)
    : '未設定'

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs">
      <p className="flex items-center gap-1.5 truncate border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-900">
        <ListTodo className="h-3.5 w-3.5 shrink-0 text-[#FD7601]" strokeWidth={2} />
        <span className="truncate">{task.title}</span>
      </p>
      <div className="space-y-1.5 p-3 text-xs text-slate-500">
        {task.goalSummary && <p className="truncate">目標: {task.goalSummary}</p>}
        {task.dueDate && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              isOverdue ? 'bg-red-50 text-red-600' : 'bg-(--success-bg) text-(--green-600)'
            }`}
          >
            期限: {task.dueDate}
          </span>
        )}
        <p>メンバー数: {task.memberEmployeeIds.length}</p>
        <p>責任者: {responsibleName}</p>
        {canEdit && (
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onEdit} className="text-[10px] text-slate-600 underline">
              編集
            </button>
            <button type="button" onClick={onDelete} className="text-[10px] text-red-600 underline">
              削除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
