import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import {
  getObjectiveDetail,
  getWorkLogSummaryByObjective,
} from '@/features/task-management/queries'
import { MilestoneList } from '@/features/task-management/components/MilestoneList'
import { MilestoneForm } from '@/features/task-management/components/MilestoneForm'
import { WorkDistributionChart } from '@/features/task-management/components/WorkDistributionChart'
import { ProgressRing } from '@/features/task-management/components/ProgressRing'
import { isObjectiveOwner } from '@/features/task-management/permissions'

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  const supabase = await createClient()
  const {
    objective,
    milestones,
    taskGroupsByMilestoneId,
    milestoneProgressById,
    objectiveProgress,
  } = await getObjectiveDetail(supabase, id)
  const workLogSummary = await getWorkLogSummaryByObjective(supabase, id)
  // 表示制御のみの判定（UIの出し分け）。実際のアクセス制御は task_milestones の RLS INSERT ポリシーが担う。
  // user が null、または employee_id が未設定（従業員レコード無しユーザー）の場合は責任者ではない扱いにする。
  const isOwner = user?.employee_id
    ? isObjectiveOwner(objective.ownerEmployeeId, user.employee_id)
    : false

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-slate-900">{objective.title}</h1>
          {objective.description && (
            <p className="mt-1 text-xs text-slate-500">{objective.description}</p>
          )}
        </div>
        <ProgressRing progress={objectiveProgress} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">マイルストーン</h2>
        <MilestoneList
          milestones={milestones}
          taskGroupsByMilestoneId={taskGroupsByMilestoneId}
          milestoneProgressById={milestoneProgressById}
          canCreateTaskGroup={isOwner}
        />
        {isOwner && <MilestoneForm objectiveId={objective.id} />}
      </section>

      <section className="rounded-lg border border-slate-200 p-3">
        <h2 className="text-xs font-semibold text-slate-900 mb-2">タスクグループ別工数分布</h2>
        <WorkDistributionChart
          data={workLogSummary.map(s => ({
            id: s.taskGroupId,
            label: s.taskGroupName,
            hours: s.totalHours,
          }))}
          emptyMessage="工数記録はまだありません。"
        />
      </section>
    </div>
  )
}
