import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getActiveReferralPostings,
  getReferralRanking,
} from '@/features/referral/queries'
import { ReferralFormPageClient } from './ReferralFormPageClient'

export const metadata = {
  title: '社員紹介採用 | HR-DX',
}

export default async function ReferralFormPage() {
  // 認証チェック（employee_id が必要）
  const user = await getServerUser()
  if (!user?.employee_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  // データ並行取得（ランキングは上位5名）
  const [postings, ranking] = await Promise.all([
    getActiveReferralPostings(),
    getReferralRanking(5),
  ])

  return <ReferralFormPageClient postings={postings} ranking={ranking} />
}
