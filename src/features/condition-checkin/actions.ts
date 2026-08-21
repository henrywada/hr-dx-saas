'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { toJSTDateString, jstDayStartUtcIso } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import { postConditionAlertAnnouncement } from '@/features/dashboard/actions'
import { submitConditionCheckinSchema, type SubmitConditionCheckinInput } from './types'

async function notifyMedicalStaffOnConditionAlert(
  tenantId: string,
  employeeId: string
): Promise<void> {
  const supabase = await createClient()
  const todayYmd = toJSTDateString()
  const dedupeMarker = `condition-alert:${employeeId}:${todayYmd}`

  const { data: alerts, error: alertError } = await supabase.rpc(
    'check_employee_condition_drop_alert',
    { p_employee_id: employeeId }
  )
  if (alertError || !alerts || alerts.length === 0) return

  const { data: existing } = await supabase
    .from('announcements')
    .select('id')
    .eq('tenant_id', tenantId)
    .gte('published_at', jstDayStartUtcIso(todayYmd))
    .like('body', `%${dedupeMarker}%`)
    .limit(1)
  if (existing && existing.length > 0) return

  const alert = alerts[0] as {
    alert_type: string
    recent_avg: number | null
    prior_avg: number | null
    consecutive_low_days: number
  }

  const alertLabel =
    alert.alert_type === 'week_drop'
      ? `7日間平均が ${alert.prior_avg} → ${alert.recent_avg} に低下`
      : `低スコア（1〜2）が ${alert.consecutive_low_days} 日連続`

  // 宛先（産業医・保健師）の解決、対象従業員名の埋め込みはRPC内部で行う。
  // 呼び出し元が任意の宛先・本文タイトルを指定することはできない
  await postConditionAlertAnnouncement({
    employeeId,
    alertLabel,
    dedupeMarker,
  })
}

export async function submitCondition(input: SubmitConditionCheckinInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = submitConditionCheckinSchema.parse(input)
  const supabase = await createClient()
  const todayYmd = toJSTDateString()

  const { error } = await supabase.from('condition_checkins').upsert(
    {
      tenant_id: user.tenant_id,
      employee_id: user.employee_id,
      score: parsed.score,
      memo: parsed.memo ?? null,
      checkin_date: todayYmd,
    },
    { onConflict: 'employee_id,checkin_date' }
  )

  if (error) throw error

  await notifyMedicalStaffOnConditionAlert(user.tenant_id, user.employee_id)

  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  revalidatePath(APP_ROUTES.TENANT.CONDITION)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONDITION_TREND)
}
