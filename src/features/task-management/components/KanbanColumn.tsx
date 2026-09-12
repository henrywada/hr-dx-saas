'use client'

import { useDroppable } from '@dnd-kit/core'
import type { TaskStatus } from '../types'

interface KanbanColumnProps {
  status: TaskStatus
  label: string
  children: React.ReactNode
}

/**
 * カンバンの1ステータス列。React の hooks ルール上 useDroppable は
 * map コールバック内で直接呼べないため、列を独立コンポーネントに分離している。
 */
export function KanbanColumn({ status, label, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-700">{label}</h3>
      <div
        ref={setNodeRef}
        className={`min-h-16 space-y-2 rounded-lg transition-colors ${
          isOver ? 'bg-[#f6f8fa] ring-1 ring-[#FD7601]/50' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}
