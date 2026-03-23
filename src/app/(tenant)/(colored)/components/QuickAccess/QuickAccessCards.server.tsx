import { Clock, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
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

  return (
    <>
      <QuickAccessTeleworkCard />
      {showClockCard && (
        <QuickAccessCard
          href="/apps/attendance/scan"
          title="出退勤の打刻"
          subtitle="出退勤をQRコードのスキャンで打刻"
          icon={Clock}
          iconBoxClass="bg-sky-100 text-sky-700"
          titleHoverClass="group-hover:text-sky-600"
        />
      )}
      {showQrAdminCard && (
        <QuickAccessCard
          href="/apps/attendance/qr-punch"
          title="ＱＲコード表示（管理者用）"
          subtitle="スキャンするQRコードを表示"
          icon={QrCode}
          iconBoxClass="bg-violet-100 text-violet-700"
          titleHoverClass="group-hover:text-violet-600"
        />
      )}
    </>
  )
}
