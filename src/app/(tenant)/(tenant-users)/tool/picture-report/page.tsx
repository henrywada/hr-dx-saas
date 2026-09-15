// 画像送信（写真レポート）画面 — Server Component
// Task 7 の queries.ts のみを呼び出し、supabase.from(...) は直接叩かない
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { getPictureSendSubjects, getMyRecentSends } from '@/features/picture-report/queries'
import { APP_ROUTES } from '@/config/routes'
import { PictureReportForm } from './PictureReportForm'

const RECENT_SENDS_LIMIT = 5

export default async function PictureReportPage() {
  const user = await getServerUser()
  if (!user?.id) redirect(APP_ROUTES.AUTH.LOGIN)

  const [subjects, recentSends] = await Promise.all([
    getPictureSendSubjects(),
    getMyRecentSends(RECENT_SENDS_LIMIT),
  ])

  return (
    <PictureReportForm
      userEmail={user.email ?? ''}
      isManager={Boolean(user.is_manager)}
      initialSubjects={subjects}
      initialRecentSends={recentSends}
    />
  )
}
