import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getGrantNotifierOverview } from '@/features/grant-notifier/queries'
import { GrantNotifierHome } from '@/features/grant-notifier/components/GrantNotifierHome'

export const metadata = {
  title: '助成金情報配信 | HR-DX',
}

export default async function GrantNotifierPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const overview = await getGrantNotifierOverview()

  return <GrantNotifierHome overview={overview} canEdit={user.appRole !== 'employee'} />
}
