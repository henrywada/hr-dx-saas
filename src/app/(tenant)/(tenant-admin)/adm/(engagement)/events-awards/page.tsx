import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getAllEventsForAdmin,
  getEventAttendees,
  getAwardsForAdmin,
} from '@/features/internal-events/queries'
import { getEmployees, getDivisions } from '@/features/organization/queries'
import { getMonthlyMvpCandidates } from '@/features/recognition/queries'
import { EventFormDialog } from '@/features/internal-events/components/admin/EventFormDialog'
import { EventAdminCard } from '@/features/internal-events/components/admin/EventAdminCard'
import { AwardsAdminSection } from '@/features/internal-events/components/admin/AwardsAdminSection'
import TenantBackLink from '@/components/common/TenantBackLink'

const HR_ROLES = ['hr', 'hr_manager', 'developer']

export const metadata = { title: 'イベント・表彰管理' }

export default async function EventsAwardsAdminPage() {
  const user = await getServerUser()
  if (!user || !HR_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const [events, awards, employeesRaw, mvpSuggestions, divisions] = await Promise.all([
    getAllEventsForAdmin(),
    getAwardsForAdmin(),
    getEmployees(),
    getMonthlyMvpCandidates(),
    getDivisions(),
  ])

  const eventsWithAttendees = await Promise.all(
    events.map(async event => ({
      event,
      attendees: await getEventAttendees(event.id),
    }))
  )

  const employeeOptions = employeesRaw
    .filter((e): e is typeof e & { name: string } => Boolean(e.name))
    .map(e => ({ id: e.id, name: e.name }))

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto max-w-300 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-semibold text-slate-900">イベント・表彰管理</h1>
        <TenantBackLink />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500">社内イベント</h2>
          <EventFormDialog divisions={divisions} />
        </div>
        {eventsWithAttendees.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 text-sm text-slate-500">
            登録されたイベントはありません。
          </div>
        ) : (
          <div className="space-y-3">
            {eventsWithAttendees.map(({ event, attendees }) => (
              <EventAdminCard
                key={event.id}
                event={event}
                attendees={attendees}
                divisions={divisions}
              />
            ))}
          </div>
        )}
      </section>

      <AwardsAdminSection
        employees={employeeOptions}
        periodLabel={mvpSuggestions.periodLabel}
        candidates={mvpSuggestions.candidates}
        awards={awards}
      />
    </div>
  )
}
