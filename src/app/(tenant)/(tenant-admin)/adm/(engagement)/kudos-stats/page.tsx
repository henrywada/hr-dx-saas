import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getKudosStatsByDivision, getKudosPersonalRanking } from '@/features/recognition/queries'
import { KudosStatsClient } from '@/features/recognition/components/admin/KudosStatsClient'

const HR_ROLES = ['hr', 'hr_manager', 'developer']
const STATS_PERIOD_DAYS = 30

export const metadata = { title: '感謝・称賛 集計' }

export default async function KudosStatsAdminPage() {
  const user = await getServerUser()
  if (!user || !HR_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const [divisionStats, personalRanking] = await Promise.all([
    getKudosStatsByDivision(STATS_PERIOD_DAYS),
    getKudosPersonalRanking(STATS_PERIOD_DAYS),
  ])

  return (
    <KudosStatsClient
      divisionStats={divisionStats}
      personalRanking={personalRanking}
      periodDays={STATS_PERIOD_DAYS}
    />
  )
}
