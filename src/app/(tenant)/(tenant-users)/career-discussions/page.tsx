import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getMyCareerDiscussions,
  getDiscussionsIConducted,
  getActiveEmployeesForCareerDiscussion,
  getCareerDiscussionThemeTemplates,
  getEvaluationPeriodOptions,
} from '@/features/career-discussions/queries'
import { CareerDiscussionList } from '@/features/career-discussions/components/CareerDiscussionList'
import { RecordDiscussionButton } from '@/features/career-discussions/components/RecordDiscussionButton'

export const metadata = { title: 'キャリア面談' }

export default async function CareerDiscussionsPage() {
  const user = await getServerUser()
  if (!user?.employee_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const canRecord = Boolean(user.is_manager)

  const [myDiscussions, conductedDiscussions, employees, templates, evaluationPeriods] =
    await Promise.all([
      getMyCareerDiscussions(user.employee_id),
      canRecord ? getDiscussionsIConducted(user.employee_id) : Promise.resolve([]),
      canRecord ? getActiveEmployeesForCareerDiscussion() : Promise.resolve([]),
      getCareerDiscussionThemeTemplates(),
      getEvaluationPeriodOptions(),
    ])

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto max-w-300 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-slate-900">キャリア面談</h1>
        {canRecord && (
          <RecordDiscussionButton
            employees={employees}
            templates={templates}
            evaluationPeriods={evaluationPeriods}
          />
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500">自分の面談履歴</h2>
          <CareerDiscussionList
            rows={myDiscussions}
            emptyMessage="まだキャリア面談の記録はありません。"
          />
        </section>
        {canRecord && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-slate-500">自分が記録した面談</h2>
            <CareerDiscussionList
              rows={conductedDiscussions}
              showEmployeeName
              emptyMessage="部下とのキャリア面談を記録しましょう。"
            />
          </section>
        )}
      </div>
    </div>
  )
}
