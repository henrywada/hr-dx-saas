import { ClipboardCheck, Clock, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { fetchEmployeeIdsInDivision } from '@/app/api/overtime/_approver-auth'
import { getJSTYearMonth, lastDayOfMonthYmd } from '@/lib/datetime'
import { QuickAccessCard } from './QuickAccessCard'
import { QuickAccessTeleworkCard } from './QuickAccessTeleworkCard.client'

const QR_ATTENDANCE_SERVICE_PATH = '/adm/qr_atendance'

/** テナント契約サービス + 監督者 QR 権限 + 端末登録（テレワークはクライアント側）に応じたクイックアクセス */
export default async function QuickAccessCards() {
  const supabase = await createClient()
  const user = await getServerUser()
  const tenantId = user?.tenant_id ?? null
  const userId = user?.id ?? null

  if (!tenantId || !userId) {
    return null
  }

  const { data: svc } = await supabase
    .from('service')
    .select('id')
    .eq('route_path', QR_ATTENDANCE_SERVICE_PATH)
    .maybeSingle()

  const [tsRes, permRes] = await Promise.all([
    svc?.id
      ? supabase
          .from('tenant_service')
          .select('id', { count: 'exact', head: true })
          .eq('service_id', svc.id)
          .eq('tenant_id', tenantId)
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from('supervisor_qr_permissions')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('employee_user_id', userId)
      .eq('can_display', true)
      .limit(1)
      .maybeSingle(),
  ])

  const tenantSvcCount = tsRes.count ?? 0
  const permRow = permRes.data
  const permErr = permRes.error

  const showClockCard = !!svc?.id && (tenantSvcCount ?? 0) > 0
  const showQrAdminCard = !permErr && !!permRow

  /**
   * 上長向け: 承認画面（/approval）と同じく同一部署の peer 範囲かつ JST 当月の勤務日に限定し、
   * status=申請中 の件数を表示（一覧の「申請中」フィルタ相当。上長本人の申請も含む）
   */
  let overtimePendingBadgeLabel: string | null = null
  if (user.is_manager === true && user.division_id) {
    const { ids: peerIds, error: peerFetchErr } = await fetchEmployeeIdsInDivision(
      supabase,
      tenantId,
      user.division_id,
    )
    if (!peerFetchErr && peerIds.length > 0) {
      const month = getJSTYearMonth()
      const firstDay = `${month}-01`
      const lastDay = lastDayOfMonthYmd(month)
      const { count, error } = await supabase
        .from('overtime_applications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', '申請中')
        .in('employee_id', peerIds)
        .gte('work_date', firstDay)
        .lte('work_date', lastDay)
      if (!error && (count ?? 0) > 0) {
        const n = count ?? 0
        overtimePendingBadgeLabel = n > 99 ? '99+件' : `${n}件`
      }
    }
  }

  return (
    <>
      <QuickAccessTeleworkCard />
      {showClockCard && (
        <QuickAccessCard
          href="/apps/attendance/scan"
          title="出退勤のQRコード打刻"
          subtitle="出退勤をQRコードのスキャンで打刻"
          icon={Clock}
          iconBoxClass="bg-sky-100 text-sky-700"
          titleHoverClass="group-hover:text-sky-600"
        />
      )}
      {showQrAdminCard && (
        <QuickAccessCard
          href="/apps/attendance/qr-punch"
          title="打刻用QRコード表示（監督者用）"
          subtitle="スキャンするQRコードを表示"
          icon={QrCode}
          iconBoxClass="bg-violet-100 text-violet-700"
          titleHoverClass="group-hover:text-violet-600"
        />
      )}
      {user.is_manager === true && (
        <QuickAccessCard
          href={APP_ROUTES.TENANT.OVERTIME_APPROVAL}
          title="残業申請の承認"
          subtitle="あなたの部下からの残業申請を承認・確認"
          icon={ClipboardCheck}
          iconBoxClass="bg-orange-50 text-orange-700"
          titleHoverClass="group-hover:text-orange-700"
          badgeLabel={overtimePendingBadgeLabel}
        />
      )}
    </>
  )
}
