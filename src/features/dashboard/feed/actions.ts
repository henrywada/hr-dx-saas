'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { NOTIFICATIONS_PAGE_LIMIT } from './queries'

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
  revalidatePath(APP_ROUTES.TENANT.NOTIFICATIONS)
}

/**
 * 渡された dedupeKey を一括で既読にする（自分の read-state のみ、RLS でスコープ済み）。
 * dedupeKeys は Server Action として直接呼び出し可能なため、意図せぬ大量 upsert を防ぐ
 * 目的で /notifications 一覧の表示上限（NOTIFICATIONS_PAGE_LIMIT）を上限として切り詰める。
 */
export async function markAllFeedItemsRead(dedupeKeys: string[]): Promise<void> {
  const keys = dedupeKeys.slice(0, NOTIFICATIONS_PAGE_LIMIT)
  if (keys.length === 0) return

  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) throw new Error('Unauthorized')

  const supabase = await createClient()
  const rows = keys.map(dedupeKey => ({
    tenant_id: user.tenant_id as string,
    employee_id: user.employee_id as string,
    dedupe_key: dedupeKey,
  }))
  const { error } = await supabase
    .from('dashboard_feed_read_state')
    .upsert(rows, { onConflict: 'employee_id,dedupe_key' })

  if (error) throw error
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  revalidatePath(APP_ROUTES.TENANT.NOTIFICATIONS)
}
