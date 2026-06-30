import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getMyCareerDiscussions,
  getDiscussionsIConducted,
  getActiveEmployeesForCareerDiscussion,
  getCareerDiscussionThemeTemplates,
  getEvaluationPeriodOptions,
  getUpcomingCareerAppointments,
} from '@/features/career-discussions/queries'
import { CareerDiscussionList } from '@/features/career-discussions/components/CareerDiscussionList'
import { RecordDiscussionButton } from '@/features/career-discussions/components/RecordDiscussionButton'
import { ScheduleAppointmentButton } from '@/features/career-discussions/components/ScheduleAppointmentButton'
import { CareerAppointmentList } from '@/features/career-discussions/components/CareerAppointmentList'
import { getRecentOneOnOneSessionsForEmployees } from '@/features/one-on-one/queries'

export const metadata = { title: 'キャリア面談' }

export default async function CareerDiscussionsPage() {
  const user = await getServerUser()
  if (!user?.employee_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const canRecord = Boolean(user.is_manager)

  const [
    myDiscussions,
    conductedDiscussions,
    employees,
    templates,
    evaluationPeriods,
    myAppointments,
    scheduledByMe,
  ] = await Promise.all([
    getMyCareerDiscussions(user.employee_id),
    canRecord ? getDiscussionsIConducted(user.employee_id) : Promise.resolve([]),
    canRecord ? getActiveEmployeesForCareerDiscussion() : Promise.resolve([]),
    getCareerDiscussionThemeTemplates(),
    getEvaluationPeriodOptions(),
    getUpcomingCareerAppointments({ employeeId: user.employee_id }),
    canRecord
      ? getUpcomingCareerAppointments({ scheduledByEmployeeId: user.employee_id })
      : Promise.resolve([]),
  ])

  const oneOnOneEmployeeIds = canRecord
    ? employees.map(e => e.id)
    : [user.employee_id]
  const oneOnOneByEmployee = await getRecentOneOnOneSessionsForEmployees(oneOnOneEmployeeIds)

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto max-w-300 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-sm font-semibold text-slate-900">キャリア面談</h1>
        {canRecord && (
          <div className="flex flex-wrap gap-2">
            <ScheduleAppointmentButton employees={employees} templates={templates} />
            <RecordDiscussionButton
              employees={employees}
              templates={templates}
              evaluationPeriods={evaluationPeriods}
              oneOnOneByEmployee={oneOnOneByEmployee}
            />
          </div>
        )}
      </div>

      {(myAppointments.length > 0 || (canRecord && scheduledByMe.length > 0)) && (
        <section className="space-y-3">
          {myAppointments.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500">自分への予約</h2>
              <CareerAppointmentList appointments={myAppointments} />
            </div>
          )}
          {canRecord && scheduledByMe.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500">自分が予約した面談</h2>
              <CareerAppointmentList appointments={scheduledByMe} manageable />
            </div>
          )}
        </section>
      )}

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
