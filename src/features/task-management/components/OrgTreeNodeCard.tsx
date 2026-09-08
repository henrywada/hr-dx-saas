import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ProgressBar } from './ProgressBar'
import { Badge } from '@/components/ui/Badge'
import type { OrgTreeNodeRole } from '../org-tree'

export interface OrgTreeNodeCardData {
  label: string
  role: OrgTreeNodeRole
  taskCount: number
  progressPercent: number
  [key: string]: unknown
}

const ROLE_LABEL: Record<OrgTreeNodeRole, string> = {
  owner: '責任者',
  task_group: 'タスクグループ',
  manager: 'マネージャー',
  member: 'メンバー',
}

const ROLE_BADGE_VARIANT: Record<OrgTreeNodeRole, 'primary' | 'teal' | 'orange' | 'neutral'> = {
  owner: 'orange',
  task_group: 'neutral',
  manager: 'teal',
  member: 'primary',
}

/** 組織ツリーの1ノード（責任者・タスクグループ・マネージャー・メンバー）を表すカード */
export function OrgTreeNodeCard({ data }: NodeProps) {
  const { label, role, taskCount, progressPercent } = data as unknown as OrgTreeNodeCardData

  return (
    <div className="w-44 rounded-lg border border-slate-200 bg-white p-2.5 shadow-xs">
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />
      <Badge variant={ROLE_BADGE_VARIANT[role]} className="!px-2 !py-0.5 !text-[10px]">
        {ROLE_LABEL[role]}
      </Badge>
      <p className="mt-1.5 truncate text-xs font-semibold text-slate-900" title={label}>
        {label}
      </p>
      <p className="mt-1 text-[10px] text-slate-500">担当タスク {taskCount}件</p>
      <div className="mt-1">
        <ProgressBar progress={progressPercent} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
    </div>
  )
}
