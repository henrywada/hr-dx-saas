import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getGrantConditions } from '@/features/grant-notifier/queries'
import { ConditionsForm } from '@/features/grant-notifier/components/ConditionsForm'

export const metadata = {
  title: '配信条件の設定 | 助成金情報配信 | HR-DX',
}

export default async function GrantNotifierConditionsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const condition = await getGrantConditions()

  return <ConditionsForm condition={condition} canEdit={user.appRole !== 'employee'} />
}
