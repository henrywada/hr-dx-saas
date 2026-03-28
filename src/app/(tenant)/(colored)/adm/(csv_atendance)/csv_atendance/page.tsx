import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { canAccessHrAttendanceDashboard } from '@/features/attendance/hr-dashboard-access'
import { WorkTimeCsvWizard } from '../components/WorkTimeCsvWizard'

export const metadata = {
  title: '勤怠実績 CSV 取り込み',
}

/**
 * 非 QR 従業員の実勤務時間を CSV から取り込む（人事向けウィザード）
 */
export default async function CsvAtendanceImportPage() {
  const user = await getServerUser()
  if (!user?.tenant_id || !user?.id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  if (!canAccessHrAttendanceDashboard(user)) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">勤怠実績 CSV 取り込み</h1>
        <p className="text-sm text-slate-600">
          この機能は人事（hr）、人事マネージャー、テナント管理者、または開発者ロールのみ利用できます。
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">勤怠実績 CSV 取り込み</h1>
        <p className="text-sm text-slate-500 mt-1">
          QR 打刻を使わない従業員の勤務データを CSV で登録します。読み込み・チェック・一覧確認・修正のあと、保存で{' '}
          <code className="text-xs bg-slate-100 px-1 rounded">work_time_records</code>{' '}
          に反映されます。
        </p>
      </div>
      <WorkTimeCsvWizard />
    </div>
  )
}
