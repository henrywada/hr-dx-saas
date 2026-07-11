import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { QrPunchSupervisorClient } from '@/features/qr-punch/components/QrPunchSupervisorClient'

export const metadata = {
  title: 'QR 打刻（監督者）',
}

export default async function QrPunchSupervisorPage() {
  const user = await getServerUser()
  if (!user) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const isLocked = user.appRole === 'employee' && user.is_manager !== true

  if (isLocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent-teal px-4">
        <div className="max-w-sm rounded-2xl border border-[#e2e6ec] bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#24292f]">あなたはこの画面を使えません</p>
          <p className="mt-2 text-xs text-[#57606a]">
            QR 打刻（監督者）は上長・管理者向けの機能です。
          </p>
        </div>
      </div>
    )
  }

  return <QrPunchSupervisorClient />
}
