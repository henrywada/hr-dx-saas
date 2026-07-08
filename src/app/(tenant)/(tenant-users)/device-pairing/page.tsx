import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import DeviceRegistrationForm from './components/DeviceRegistrationForm'
import TenantBackLink from '@/components/common/TenantBackLink'

/**
 * テレワーク用 PC の登録申請（/device-pairing、(tenant-users) ポータルレイアウト）
 */
export default async function DevicePairingPage() {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">テレワーク端末ペアリング</h1>
          <p className="text-sm text-slate-500 mt-1">
            社用PCの登録申請を行います。申請後は人事が承認するとテレワーク打刻用の端末認証が有効になります。
          </p>
        </div>
        <TenantBackLink />
      </div>

      <DeviceRegistrationForm defaultEmployeeNo={user.employee_no} />
    </div>
  )
}
