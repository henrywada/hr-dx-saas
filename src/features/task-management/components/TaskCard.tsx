'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ListTodo } from 'lucide-react'
import type { Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

interface TaskCardProps {
  task: Task
  /** 従業員ID→氏名のマップ（担当者名の表示に使う） */
  employeeNameById: Record<string, string>
  /** カード押下時に呼ばれる。モーダルの開閉状態は KanbanBoard 側で一元管理する
   * （最終レビュー Finding I4: TaskCard 自身が isModalOpen を持つと、ステータス変更で
   * タスクが別のステータス列（別の親要素）に移動した際に TaskCard がアンマウント/再マウント
   * され、開いていたモーダルが理由不明に閉じてしまう不具合があった） */
  onOpen: () => void
  /** ドラッグでのステータス変更を許可するか（責任者/マネージャー、または自分が担当者の場合のみ true） */
  canDrag: boolean
}

/**
 * カンバン上のタスクカード。クリックすると TaskDetailModal を開く。
 * ステータス・進捗率の編集操作、コメントはすべてモーダル内に集約する。
 * ステータス変更はモーダル内のプルダウンに加え、カード自体のドラッグ&ドロップでも行える
 * （`useDraggable` の activationConstraint により、クリックとドラッグ開始は区別される）。
 */
export function TaskCard({ task, employeeNameById, onOpen, canDrag }: TaskCardProps) {
  const assigneeNames = task.assigneeEmployeeIds.map(id => employeeNameById[id] ?? id)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canDrag,
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`w-full rounded-lg border border-slate-200 bg-white text-left shadow-xs hover:bg-[#f6f8fa] ${
        isDragging ? 'opacity-40' : ''
      } ${canDrag ? 'touch-none' : ''}`}
      {...listeners}
      {...attributes}
    >
      <p className="flex items-center gap-1.5 truncate border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-900">
        <ListTodo className="h-3.5 w-3.5 shrink-0 text-[#FD7601]" strokeWidth={2} />
        <span className="truncate">{task.title}</span>
      </p>
      <div className="p-3">
        <p className="text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
        {task.goalSummary && (
          <p className="mt-1 truncate text-[10px] text-slate-500" title={task.goalSummary}>
            目標: {task.goalSummary}
          </p>
        )}
        <p className="mt-1 truncate text-[10px] text-slate-500">
          担当: {assigneeNames.length > 0 ? assigneeNames.join('、') : '未割当'}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full bg-[#FD7601] transition-[width] duration-(--duration-normal) ease-(--ease-out-quart)"
            style={{ width: `${task.progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
      </div>
    </button>
  )
}
