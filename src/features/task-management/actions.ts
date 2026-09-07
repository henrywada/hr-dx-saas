'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import {
  createObjectiveSchema,
  type CreateObjectiveInput,
  createMilestoneSchema,
  type CreateMilestoneInput,
  createTaskGroupSchema,
  type CreateTaskGroupInput,
} from './types'

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

/**
 * マイルストーン（task_milestones）を新規作成する。
 *
 * 注意: AppUser.tenant_id は optional（`src/types/auth.ts` 参照。
 * 従業員レコードが無いユーザーは undefined になりうる）。
 * task_milestones.tenant_id は NOT NULL のため、ここで欠落を検出して早期に弾く。
 */
export async function createMilestone(input: CreateMilestoneInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id) {
    throw new Error('テナント情報が取得できませんでした')
  }

  const parsed = createMilestoneSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('task_milestones')
    .insert({
      tenant_id: user.tenant_id,
      objective_id: parsed.objectiveId,
      title: parsed.title,
      description: parsed.description ?? null,
      due_date: parsed.dueDate ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.objectiveDetail(parsed.objectiveId))

  return { id: data.id }
}

/**
 * タスクグループ（task_groups）を新規作成する。
 *
 * 注意: AppUser.tenant_id は optional（`src/types/auth.ts` 参照。
 * 従業員レコードが無いユーザーは undefined になりうる）。
 * task_groups.tenant_id は NOT NULL のため、ここで欠落を検出して早期に弾く。
 *
 * revalidatePath には目標詳細ページのパスが必要だが、入力には milestoneId しか
 * 含まれないため、先にマイルストーンから objective_id を引いてから挿入する。
 */
export async function createTaskGroup(input: CreateTaskGroupInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user) throw new Error('Unauthorized')
  if (!user.tenant_id) {
    throw new Error('テナント情報が取得できませんでした')
  }

  const parsed = createTaskGroupSchema.parse(input)
  const supabase = await createClient()

  const { data: milestone, error: milestoneError } = await supabase
    .from('task_milestones')
    .select('objective_id')
    .eq('id', parsed.milestoneId)
    .single()

  if (milestoneError) throw milestoneError

  const { data, error } = await supabase
    .from('task_groups')
    .insert({
      tenant_id: user.tenant_id,
      milestone_id: parsed.milestoneId,
      name: parsed.name,
      description: parsed.description ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.tasks.objectiveDetail(milestone.objective_id))

  return { id: data.id }
}
