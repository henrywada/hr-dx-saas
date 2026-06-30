'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { toJSTDateString, jstDayStartUtcIso } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import { createAnnouncement } from '@/features/dashboard/actions'
import { submitConditionCheckinSchema, type SubmitConditionCheckinInput } from './types'

const MEDICAL_ROLES = ['company_doctor', 'company_nurse']

async function notifyMedicalStaffOnConditionAlert(
  tenantId: string,
  employeeId: string,
  employeeName: string
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

  const { data: staffRows, error: staffError } = await supabase
    .from('employees')
    .select('id, app_role:app_role_id(app_role)')
    .eq('tenant_id', tenantId)
    .eq('active_status', 'active')

  if (staffError || !staffRows) return

  const medicalStaffIds = staffRows
    .filter(row => {
      const role = row.app_role as { app_role?: string } | null
      return role?.app_role && MEDICAL_ROLES.includes(role.app_role)
    })
    .map(row => row.id)

  const body = `${alertLabel}\n\n/adm/condition-trend で詳細を確認してください。\n${dedupeMarker}`

  await Promise.all(
    medicalStaffIds.map(staffId =>
      createAnnouncement({
        title: `⚠️ コンディション低下アラート: ${employeeName}`,
        body,
        target_audience: '産業医・保健師',
        recipient_employee_id: staffId,
        is_new: true,
        sort_order: 20,
      })
    )
  )
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

  await notifyMedicalStaffOnConditionAlert(
    user.tenant_id,
    user.employee_id,
    user.name ?? '従業員'
  )

  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  revalidatePath(APP_ROUTES.TENANT.CONDITION)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONDITION_TREND)
}
