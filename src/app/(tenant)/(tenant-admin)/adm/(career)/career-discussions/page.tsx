import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getCareerDiscussionsForAdmin,
  getActiveEmployeesForCareerDiscussion,
  getCareerDiscussionThemeTemplates,
  getEvaluationPeriodOptions,
  getUpcomingCareerAppointments,
  getCareerOverdueEmployees,
} from '@/features/career-discussions/queries'
import { CareerDiscussionList } from '@/features/career-discussions/components/CareerDiscussionList'
import { RecordDiscussionButton } from '@/features/career-discussions/components/RecordDiscussionButton'
import { ScheduleAppointmentButton } from '@/features/career-discussions/components/ScheduleAppointmentButton'
import { CareerAppointmentList } from '@/features/career-discussions/components/CareerAppointmentList'
import { CareerOverdueReminder } from '@/features/career-discussions/components/CareerOverdueReminder'
import { getRecentOneOnOneSessionsForEmployees } from '@/features/one-on-one/queries'

export const metadata = { title: 'キャリア面談管理' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function AdminCareerDiscussionsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const [discussions, employees, templates, evaluationPeriods, appointments, overdueEmployees] =
    await Promise.all([
      getCareerDiscussionsForAdmin(),
      getActiveEmployeesForCareerDiscussion(),
      getCareerDiscussionThemeTemplates(),
      getEvaluationPeriodOptions(),
      getUpcomingCareerAppointments(),
      getCareerOverdueEmployees(),
    ])

  const employeeIds = employees.map(e => e.id)
  const oneOnOneByEmployee = await getRecentOneOnOneSessionsForEmployees(employeeIds)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px] space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-sm font-semibold text-slate-900">キャリア面談管理</h1>
        <div className="flex flex-wrap gap-2">
          <ScheduleAppointmentButton employees={employees} templates={templates} />
          <RecordDiscussionButton
            employees={employees}
            templates={templates}
            evaluationPeriods={evaluationPeriods}
            oneOnOneByEmployee={oneOnOneByEmployee}
          />
        </div>
      </div>

      {overdueEmployees.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-slate-500">未実施リマインダー</h2>
          <CareerOverdueReminder overdueEmployees={overdueEmployees} />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-500">予約済み面談</h2>
        <CareerAppointmentList appointments={appointments} manageable />
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-500">面談記録</h2>
        <CareerDiscussionList
          rows={discussions}
          showEmployeeName
          editable
          emptyMessage="キャリア面談の記録はまだありません。"
        />
      </section>
    </div>
  )
}
