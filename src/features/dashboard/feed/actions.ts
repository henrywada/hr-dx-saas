'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

/** system_notice アイテムを既読にする（action_prompt はタスク自体が残るため対象外） */
export async function markFeedItemRead(dedupeKey: string): Promise<void> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase.from('dashboard_feed_read_state').upsert(
    {
      tenant_id: user.tenant_id,
      employee_id: user.employee_id,
      dedupe_key: dedupeKey,
    },
    { onConflict: 'employee_id,dedupe_key' }
  )

  if (error) throw error
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
}
