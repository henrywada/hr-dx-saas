'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import type { ObjectiveAchievementRow } from '../../queries'

const columns: Column<ObjectiveAchievementRow>[] = [
  { key: 'objectiveTitle', label: '目標名', sortable: true },
  { key: 'responsibleName', label: '責任者' },
  {
    key: 'averageProgress',
    label: '平均進捗率',
    sortable: true,
    render: (value: number) => `${value}%`,
  },
  {
    key: 'delayedTaskCount',
    label: '遅延タスク数',
    sortable: true,
    render: (value: number) =>
      value > 0 ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
          {value}件
        </span>
      ) : (
        <span className="text-xs text-slate-400">0件</span>
      ),
  },
]

interface ObjectiveAchievementCardProps {
  objectives: ObjectiveAchievementRow[]
}

/** 目標別の配下タスク平均進捗率・遅延タスク件数の一覧カード */
export function ObjectiveAchievementCard({ objectives }: ObjectiveAchievementCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">
        目標別達成状況（{objectives.length}件）
      </h2>
      <div className="mt-3">
        {objectives.length === 0 ? (
          <p className="text-xs text-slate-500">対象の目標がありません。</p>
        ) : (
          <DataTable
            columns={columns}
            data={objectives}
            getRowId={o => o.objectiveId}
            searchable
            searchKey="objectiveTitle"
            searchPlaceholder="目標名で検索..."
          />
        )}
      </div>
    </div>
  )
}
