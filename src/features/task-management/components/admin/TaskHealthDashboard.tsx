'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ProgressOverviewCard } from './ProgressOverviewCard'
import { StalledTaskListCard } from './StalledTaskListCard'
import { WorkloadDistributionCard } from './WorkloadDistributionCard'
import { ObjectiveAchievementCard } from './ObjectiveAchievementCard'
import type {
  TaskHealthOverview,
  StalledTaskRow,
  WorkloadRow,
  ObjectiveAchievementRow,
  DivisionOption,
} from '../../queries'

interface TaskHealthDashboardProps {
  overview: TaskHealthOverview
  stalledTasks: StalledTaskRow[]
  workload: WorkloadRow[]
  objectiveAchievements: ObjectiveAchievementRow[]
  divisions: DivisionOption[]
  selectedDivisionId: string | null
}

/** タスク健康度ダッシュボードの部門フィルタ + 4カードの並び */
export function TaskHealthDashboard({
  overview,
  stalledTasks,
  workload,
  objectiveAchievements,
  divisions,
  selectedDivisionId,
}: TaskHealthDashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') {
      params.delete('division')
    } else {
      params.set('division', value)
    }
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto max-w-[1920px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">タスク健康度</h1>
        <label className="flex items-center gap-2 text-xs text-slate-600">
          部門
          <select
            value={selectedDivisionId ?? ''}
            onChange={e => handleDivisionChange(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="">全社</option>
            <option value="unassigned">未配属</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ProgressOverviewCard overview={overview} />
        <WorkloadDistributionCard workload={workload} />
      </div>

      <StalledTaskListCard tasks={stalledTasks} />
      <ObjectiveAchievementCard objectives={objectiveAchievements} />
    </div>
  )
}
