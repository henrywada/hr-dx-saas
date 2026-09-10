'use client'

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
}

/**
 * カンバン上のタスクカード。クリックすると TaskDetailModal を開く読み取り専用表示。
 * ステータス・進捗率の編集操作、コメントはすべてモーダル内に集約する。
 */
export function TaskCard({ task, employeeNameById, onOpen }: TaskCardProps) {
  const assigneeNames = task.assigneeEmployeeIds.map(id => employeeNameById[id] ?? id)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xs hover:bg-[#f6f8fa]"
    >
      <p className="text-xs font-medium text-slate-900">{task.title}</p>
      <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
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
    </button>
  )
}
