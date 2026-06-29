import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getCareerDiscussionsForAdmin,
  getActiveEmployeesForCareerDiscussion,
  getCareerDiscussionThemeTemplates,
  getEvaluationPeriodOptions,
} from '@/features/career-discussions/queries'
import { CareerDiscussionList } from '@/features/career-discussions/components/CareerDiscussionList'
import { RecordDiscussionButton } from '@/features/career-discussions/components/RecordDiscussionButton'

export const metadata = { title: 'キャリア面談管理' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function AdminCareerDiscussionsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const [discussions, employees, templates, evaluationPeriods] = await Promise.all([
    getCareerDiscussionsForAdmin(),
    getActiveEmployeesForCareerDiscussion(),
    getCareerDiscussionThemeTemplates(),
    getEvaluationPeriodOptions(),
  ])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-slate-900">キャリア面談管理</h1>
        <RecordDiscussionButton
          employees={employees}
          templates={templates}
          evaluationPeriods={evaluationPeriods}
        />
      </div>
      <CareerDiscussionList
        rows={discussions}
        showEmployeeName
        emptyMessage="キャリア面談の記録はまだありません。"
      />
    </div>
  )
}
