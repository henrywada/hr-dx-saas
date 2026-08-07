import { getSaasGrantNotifierDashboard } from '@/features/grant-notifier/queries'
import { SaasGrantNotifierDashboard } from '@/features/grant-notifier/components/SaasGrantNotifierDashboard'

export const metadata = {
  title: '助成金情報配信 バッチ管理 | HR-DX',
}

export default async function SaasGrantNotifierPage() {
  // 権限チェックは (saas-admin)/layout.tsx と queries 側の二重で行う
  const data = await getSaasGrantNotifierDashboard()

  return <SaasGrantNotifierDashboard data={data} />
}
