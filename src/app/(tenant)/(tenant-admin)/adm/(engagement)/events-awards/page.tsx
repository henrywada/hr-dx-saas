import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getAllEventsForAdmin,
  getEventAttendees,
  getAwardsForAdmin,
} from '@/features/internal-events/queries'
import { getEmployees } from '@/features/organization/queries'
import { EventFormDialog } from '@/features/internal-events/components/admin/EventFormDialog'
import { EventAttendeeTable } from '@/features/internal-events/components/admin/EventAttendeeTable'
import { AwardFormDialog } from '@/features/internal-events/components/admin/AwardFormDialog'
import { AwardBoard } from '@/features/internal-events/components/AwardBoard'

const HR_ROLES = ['hr', 'hr_manager']

export const metadata = { title: 'イベント・表彰管理' }

export default async function EventsAwardsAdminPage() {
  const user = await getServerUser()
  if (!user || !HR_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const [events, awards, employeesRaw] = await Promise.all([
    getAllEventsForAdmin(),
    getAwardsForAdmin(),
    getEmployees(),
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
      <h1 className="text-sm font-semibold text-slate-900">イベント・表彰管理</h1>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500">社内イベント</h2>
          <EventFormDialog />
        </div>
        {eventsWithAttendees.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 text-sm text-slate-500">
            登録されたイベントはありません。
          </div>
        ) : (
          <div className="space-y-3">
            {eventsWithAttendees.map(({ event, attendees }) => (
              <div
                key={event.id}
                className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
                  <p className="text-xs text-slate-500">
                    {new Date(event.event_date).toLocaleString('ja-JP')}
                    {event.location ? ` ・ ${event.location}` : ''}
                  </p>
                </div>
                <EventAttendeeTable attendees={attendees} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500">表彰</h2>
          <AwardFormDialog employees={employeeOptions} />
        </div>
        <AwardBoard awards={awards} />
      </section>
    </div>
  )
}
