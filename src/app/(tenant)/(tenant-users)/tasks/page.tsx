import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMyObjectives } from '@/features/task-management/queries'
import { ObjectiveCard } from '@/features/task-management/components/ObjectiveCard'
import { APP_ROUTES } from '@/config/routes'

export default async function TasksPage() {
  const supabase = await createClient()
  const objectives = await getMyObjectives(supabase)

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">タスク管理</h1>
        <Link
          href={APP_ROUTES.tasks.objectiveNew}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white"
        >
          新しい目標を作成
        </Link>
      </div>
      {objectives.length === 0 ? (
        <p className="text-xs text-slate-500">関与している目標がまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {objectives.map(objective => (
            <ObjectiveCard key={objective.id} objective={objective} />
          ))}
        </div>
      )}
    </div>
  )
}
