import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import { SqpCsvImport } from '../components/SqpCsvImport'

/**
 * 人事向け: 従業員番号キーで supervisor_qr_permissions を CSV 一括登録（Edge Function 経由）
 */
export default async function SqpCsvImportPage() {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const allowed = user.appRole === 'hr' || user.appRole === 'hr_manager'
  if (!allowed) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">CSV 一括インポート</h1>
        <p className="text-sm text-slate-600">
          この機能は人事（hr）または人事マネージャー（hr_manager）のみ利用できます。
        </p>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_QR_ATENDANCE}
          className="text-sm text-accent-orange font-medium hover:underline"
        >
          QR 表示権限一覧へ戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QR 表示権限 CSV 一括インポート</h1>
        <p className="text-sm text-slate-500 mt-1">
          従業員番号（employees.employee_no）をキーに、監督者ごとの表示許可を一括で登録・更新します。処理は
          Edge Function（service role）側で行われます。
        </p>
      </div>
      <SqpCsvImport />
    </div>
  )
}
