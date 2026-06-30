import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getMyOneOnOneSessions, getMyUpcomingOneOnOnes } from '@/features/one-on-one/queries'
import { MyOneOnOneListClient } from '@/features/one-on-one/components/MyOneOnOneListClient'

export const dynamic = 'force-dynamic'

export default async function MyOneOnOnePage() {
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const [sessions, upcoming] = await Promise.all([
    getMyOneOnOneSessions(user.employee_id),
    getMyUpcomingOneOnOnes(user.employee_id),
  ])

  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-200 px-6 py-5">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              私の 1on1
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              上長との 1on1 記録と、事前共有されたアジェンダを確認できます。
            </p>
          </header>
          <div className="p-6">
            <MyOneOnOneListClient sessions={sessions} upcoming={upcoming} />
          </div>
        </div>
      </div>
    </div>
  )
}
