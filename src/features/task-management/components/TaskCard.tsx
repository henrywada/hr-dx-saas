'use client'

import { useState } from 'react'
import { TaskDetailModal } from './TaskDetailModal'
import type { Task } from '../types'

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: '低',
  normal: '中',
  high: '高',
  urgent: '緊急',
}

interface TaskCardProps {
  task: Task
  /** 閲覧者本人の従業員ID（従業員レコード無しユーザーは null） */
  myEmployeeId: string | null
  /** 閲覧者がこのタスクグループの責任者またはマネージャーか（全タスクを操作可能） */
  canOperateAllTasks: boolean
}

/**
 * カンバン上のタスクカード。クリックすると TaskDetailModal を開く読み取り専用表示。
 * ステータス・進捗率の編集操作、コメントはすべてモーダル内に集約する。
 */
export function TaskCard({ task, myEmployeeId, canOperateAllTasks }: TaskCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const canOperate = canOperateAllTasks || task.assigneeEmployeeId === myEmployeeId

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-xs hover:bg-[#f6f8fa]"
      >
        <p className="text-xs font-medium text-slate-900">{task.title}</p>
        <p className="mt-1 text-[10px] text-slate-400">優先度: {PRIORITY_LABEL[task.priority]}</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-1.5 rounded-full bg-[#FD7601]"
            style={{ width: `${task.progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-400">{task.progressPercent}%</p>
      </button>
      <TaskDetailModal
        task={task}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        canOperate={canOperate}
        currentEmployeeId={myEmployeeId}
        canModerateComments={canOperateAllTasks}
      />
    </>
  )
}
