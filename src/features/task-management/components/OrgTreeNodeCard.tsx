import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ProgressBar } from './ProgressBar'
import { Badge } from '@/components/ui/Badge'
import type { OrgTreeNodeRole } from '../org-tree'

export interface OrgTreeNodeCardData {
  label: string
  role: OrgTreeNodeRole
  taskCount: number
  progressPercent: number
  goalSummary?: string | null
  unreadAdviceCount?: number
  [key: string]: unknown
}

const ROLE_LABEL: Record<OrgTreeNodeRole, string> = {
  owner: '責任者',
  task_group: 'タスクグループ',
  manager: 'マネージャー',
  member: 'メンバー',
  task: 'タスク',
  task_assignee: '担当者',
}

const ROLE_BADGE_VARIANT: Record<OrgTreeNodeRole, 'primary' | 'teal' | 'orange' | 'neutral'> = {
  owner: 'orange',
  task_group: 'neutral',
  manager: 'teal',
  member: 'primary',
  task: 'teal',
  task_assignee: 'primary',
}

/** 組織ツリーの1ノード（責任者・タスクグループ・マネージャー・メンバー・タスク・タスク担当者）を表すカード */
export function OrgTreeNodeCard({ data }: NodeProps) {
  const { label, role, taskCount, progressPercent, goalSummary, unreadAdviceCount } =
    data as unknown as OrgTreeNodeCardData

  return (
    <div className="w-44 rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />
      <div className="flex items-center justify-between">
        <Badge variant={ROLE_BADGE_VARIANT[role]} className="!px-2 !py-0.5 !text-[10px]">
          {ROLE_LABEL[role]}
        </Badge>
        {Boolean(unreadAdviceCount) && (
          <span className="rounded-full bg-[#FD7601] px-1.5 py-0.5 text-[9px] font-semibold text-white">
            未読アドバイス {unreadAdviceCount}
          </span>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs font-semibold text-slate-900" title={label}>
        {label}
      </p>
      {goalSummary && (
        <p className="mt-0.5 truncate text-[10px] text-slate-500" title={goalSummary}>
          目標: {goalSummary}
        </p>
      )}
      <p className="mt-1 text-[10px] text-slate-500">担当タスク {taskCount}件</p>
      <div className="mt-1">
        <ProgressBar progress={progressPercent} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
    </div>
  )
}
