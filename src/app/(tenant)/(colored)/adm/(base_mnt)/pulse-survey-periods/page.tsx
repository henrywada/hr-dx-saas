import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getPulseSurveyPeriodsForAdmin } from '@/features/dashboard/queries'
import { PulseSurveyPeriodTable } from '@/features/dashboard/components/PulseSurveyPeriodTable'

export default async function PulseSurveyPeriodsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const periods = await getPulseSurveyPeriodsForAdmin()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PulseSurveyPeriodTable periods={periods} />
    </div>
  )
}
