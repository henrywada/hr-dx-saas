'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import {
  createKudosSchema,
  toggleReactionSchema,
  type CreateKudosInput,
  type ToggleReactionInput,
} from './types'

/** Kudos投稿（宛先1名以上、本文、任意でバリュータグ） */
export async function createKudos(input: CreateKudosInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = createKudosSchema.parse(input)
  const supabase = await createClient()

  const { data: kudos, error } = await supabase
    .from('kudos')
    .insert({
      tenant_id: user.tenant_id,
      sender_employee_id: user.employee_id,
      message: parsed.message,
      value_tag: parsed.valueTag ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  const { error: recipientsError } = await supabase.from('kudos_recipients').insert(
    parsed.recipientEmployeeIds.map(employeeId => ({
      kudos_id: kudos.id,
      employee_id: employeeId,
    }))
  )

  if (recipientsError) throw recipientsError

  revalidatePath(APP_ROUTES.TENANT.KUDOS)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
}

/** リアクションのトグル（1種類のスタンプ、自分の分のみ追加・削除） */
export async function toggleReaction(input: ToggleReactionInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = toggleReactionSchema.parse(input)
  const supabase = await createClient()

  const { data: existing, error: selectError } = await supabase
    .from('kudos_reactions')
    .select('kudos_id')
    .eq('kudos_id', parsed.kudosId)
    .eq('employee_id', user.employee_id)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing) {
    const { error } = await supabase
      .from('kudos_reactions')
      .delete()
      .eq('kudos_id', parsed.kudosId)
      .eq('employee_id', user.employee_id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('kudos_reactions')
      .insert({ kudos_id: parsed.kudosId, employee_id: user.employee_id })
    if (error) throw error
  }

  revalidatePath(APP_ROUTES.TENANT.KUDOS)
}
