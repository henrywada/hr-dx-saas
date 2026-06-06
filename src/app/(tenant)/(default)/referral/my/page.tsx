import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getMyNominations, getMyRewards } from '@/features/referral/queries'
import { MyNominationsClient } from './MyNominationsClient'

export const metadata = {
  title: 'マイ推薦一覧 | HR-DX',
}

export default async function MyNominationsPage() {
  // 認証チェック（employee_id が必要）
  const user = await getServerUser()
  if (!user?.employee_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  // 自分の推薦履歴と報奨金情報を並行取得
  const [nominations, rewards] = await Promise.all([
    getMyNominations(user.employee_id),
    getMyRewards(user.employee_id),
  ])

  return <MyNominationsClient nominations={nominations} rewards={rewards} />
}
