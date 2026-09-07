'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { createObjectiveSchema, type CreateObjectiveInput } from './types'

/**
 * 目標（task_objectives）を新規作成する。
 *
 * 注意: AppUser.tenant_id / employee_id は共に optional
 * （`src/types/auth.ts` 参照。従業員レコードが無いユーザーは undefined になりうる）。
 * task_objectives.tenant_id / owner_employee_id は NOT NULL のため、
 * ここで欠落を検出して早期に弾く（RLS の INSERT ポリシーが
 * owner_employee_id = current_employee_id() を要求するため、
 * employee_id が無いユーザーはそもそも作成できない）。
 */
export async function createObjective(input: CreateObjectiveInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id || !user.employee_id) {
    throw new Error('テナントまたは従業員情報が取得できませんでした')
  }

  const parsed = createObjectiveSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_objectives')
    .insert({
      tenant_id: user.tenant_id,
      owner_employee_id: user.employee_id,
      title: parsed.title,
      description: parsed.description ?? null,
      due_date: parsed.dueDate ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.root)

  return { id: data.id }
}
