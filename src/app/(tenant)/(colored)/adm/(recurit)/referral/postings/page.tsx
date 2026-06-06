import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getReferralPostingsWithCount } from '@/features/referral/queries'
import { PostingsPageClient } from './PostingsPageClient'

export const metadata = {
  title: 'リファラル求人管理 | HR-DX',
}

export default async function ReferralPostingsPage() {
  // 認証チェック
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  // 求人一覧（推薦件数付き）を取得
  const postings = await getReferralPostingsWithCount()

  return <PostingsPageClient postings={postings} />
}
