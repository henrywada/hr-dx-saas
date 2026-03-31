import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { TimecardAnomaliesClient } from './components/TimecardAnomaliesClient'

export default async function ClosureTimecardPage({
  params,
}: {
  params: Promise<{ closure_id: string }>
}) {
  const { closure_id } = await params
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <TimecardAnomaliesClient closureId={closure_id} />
    </div>
  )
}
