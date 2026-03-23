import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { SupervisorQrPermissionsClient } from './SupervisorQrPermissionsClient'

/**
 * 管理者 QR 表示権限の管理（/adm と URL 競合を避けるため /adm/qr_atendance）
 * 要件のコンポーネント配置: (qr_atendance)/components/*
 *
 * getServerUser → createClient（server）が cookies() 経由でセッションを読み、
 * クライアント側の createBrowserClient と同一プロジェクトのセッションになるようミドルウェアと揃えている。
 */
export default async function QrAtendanceSupervisorPermissionsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const canManageTenantWide = user.appRole === 'hr' || user.appRole === 'hr_manager'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">管理者 QR 表示権限</h1>
        <p className="text-sm text-slate-500 mt-1">
          自分が監督する従業員の QR 表示を許可・停止できます。変更は監査ログに記録されます。
        </p>
      </div>
      <SupervisorQrPermissionsClient
        supervisorUserId={user.id}
        tenantId={user.tenant_id}
        canManageTenantWide={canManageTenantWide}
      />
    </div>
  )
}
