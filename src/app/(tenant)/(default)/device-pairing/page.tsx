import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import DeviceRegistrationForm from './components/DeviceRegistrationForm'

/**
 * テレワーク用 PC の登録申請（/device-pairing、(default) ポータルレイアウト）
 */
export default async function DevicePairingPage() {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          テレワーク端末ペアリング
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          社用PCの登録申請を行います。申請後は人事が承認するとテレワーク打刻用の端末認証が有効になります。
        </p>
      </div>

      <DeviceRegistrationForm defaultEmployeeNo={user.employee_no} />
    </div>
  )
}
