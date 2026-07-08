import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getUpcomingEvents, getAwardHistory } from '@/features/internal-events/queries'
import { EventsPageClient } from '@/features/internal-events/components/EventsPageClient'
import TenantBackLink from '@/components/common/TenantBackLink'

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
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">社内イベント・表彰</h1>
        <TenantBackLink />
      </div>
      <EventsPageClient events={events} awards={awards} />
    </div>
  )
}
