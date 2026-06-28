import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getUpcomingEvents, getAwardHistory } from '@/features/internal-events/queries'
import { EventList } from '@/features/internal-events/components/EventList'
import { AwardBoard } from '@/features/internal-events/components/AwardBoard'

export const metadata = { title: '社内イベント・表彰' }

export default async function EventsPage() {
  const user = await getServerUser()
  if (!user?.employee_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [events, awards] = await Promise.all([
    getUpcomingEvents(user.employee_id),
    getAwardHistory(10),
  ])

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto max-w-300 space-y-4">
      <h1 className="text-sm font-semibold text-slate-900">社内イベント・表彰</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500">開催予定のイベント</h2>
          <EventList events={events} />
        </section>
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500">表彰発表</h2>
          <AwardBoard awards={awards} />
        </section>
      </div>
    </div>
  )
}
