'use client'

import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import {
  OBJECTIVE_OWNER_TYPE_LABELS,
  OBJECTIVE_STATUS_LABELS,
  OBJECTIVE_STATUS_COLORS,
} from '../types'
import type { ObjectiveWithDetails } from '../types'

interface Props {
  objectives: ObjectiveWithDetails[]
}

function progressBarColor(progress: number): string {
  if (progress >= 70) return 'bg-green-500'
  if (progress >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}

interface TreeNodeProps {
  objective: ObjectiveWithDetails
  depth: number
}

function TreeNode({ objective, depth }: TreeNodeProps) {
  const statusClass = OBJECTIVE_STATUS_COLORS[objective.status] ?? 'text-gray-600 bg-gray-100'

  return (
    <div>
      <Link
        href={APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(objective.id)}
        className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-primary/40 hover:shadow-sm transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {OBJECTIVE_OWNER_TYPE_LABELS[objective.owner_type]}
              </span>
              {objective.owner_name && (
                <span className="text-xs text-gray-500">{objective.owner_name}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">{objective.title}</p>
            {objective.key_results.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">KR {objective.key_results.length}件</p>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{objective.progress}%</p>
              <div className="mt-0.5 h-1.5 w-20 rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full ${progressBarColor(objective.progress)}`}
                  style={{ width: `${Math.min(100, objective.progress)}%` }}
                />
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>
              {OBJECTIVE_STATUS_LABELS[objective.status]}
            </span>
          </div>
        </div>
      </Link>

      {/* 子目標（再帰） */}
      {objective.children.length > 0 && (
        <div
          className="mt-2 space-y-2 border-l-2 border-gray-200 pl-4"
          style={{ marginLeft: `${(depth + 1) * 16}px` }}
        >
          {objective.children.map(child => (
            <TreeNode key={child.id} objective={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function OkrTreeView({ objectives }: Props) {
  if (objectives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-400">目標がまだありません</p>
        <p className="text-xs text-gray-300 mt-1">OKRダッシュボードから目標を追加してください</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {objectives.map(obj => (
        <TreeNode key={obj.id} objective={obj} depth={0} />
      ))}
    </div>
  )
}
