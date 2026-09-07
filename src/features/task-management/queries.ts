import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { TaskObjective } from './types'

/** DB行（snake_case）を TaskObjective（camelCase）に変換する */
function mapObjective(row: Database['public']['Tables']['task_objectives']['Row']): TaskObjective {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ownerEmployeeId: row.owner_employee_id,
    title: row.title,
    description: row.description,
    status: row.status as TaskObjective['status'],
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * 自分が閲覧可能な目標（task_objectives）一覧を取得する。
 * RLS の SELECT ポリシーが可視範囲（自分のテナント・自分の担当分等）を絞り込むため、
 * ここでは追加のテナント・権限フィルタは行わない。
 */
export async function getMyObjectives(
  supabase: SupabaseClient<Database>
): Promise<TaskObjective[]> {
  const { data, error } = await supabase
    .from('task_objectives')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(mapObjective)
}
