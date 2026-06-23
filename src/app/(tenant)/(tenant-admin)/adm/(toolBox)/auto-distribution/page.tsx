import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getAutoDistributionRules } from '@/features/auto-distribution/queries'
import { RuleListPage } from '@/features/auto-distribution/components/RuleListPage'

export const metadata = {
  title: '自動配信ルールの設定 | HR-DX',
}

export default async function AutoDistributionPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const rules = await getAutoDistributionRules()

  return <RuleListPage rules={rules} />
}
