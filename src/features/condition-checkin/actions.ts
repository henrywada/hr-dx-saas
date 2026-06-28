'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { toJSTDateString } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import { submitConditionCheckinSchema, type SubmitConditionCheckinInput } from './types'

/**
 * 1タップ記録の送信。当日分は upsert（同日に複数回タップした場合は最新の値で更新）。
 * 1日1回という頻度の制約はあるが、誤タップ訂正のための再送信までは禁止しない。
 */
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

  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  revalidatePath(APP_ROUTES.TENANT.CONDITION)
}
