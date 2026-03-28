import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TeleworkDeviceHrPanel from './components/TeleworkDeviceHrPanel'

/**
 * テレワーク用 PC の人事承認・拒否（/adm/approve_pc）
 */
export default async function ApprovePcPage() {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  if (user.appRole !== 'hr' && user.appRole !== 'hr_manager') {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          テレワーク端末承認（人事）
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          同一テナント内の端末登録を承認または拒否します。承認済みの端末も参照できます。
        </p>
        <p className="text-sm text-slate-600 mt-3">
          <Link
            href={APP_ROUTES.TENANT.PORTAL_DEVICE_PAIRING}
            className="text-indigo-600 font-medium underline-offset-2 hover:underline"
          >
            テレワーク端末ペアリング（登録申請）
          </Link>
          へ戻る
        </p>
      </div>

      <TeleworkDeviceHrPanel />
    </div>
  )
}
