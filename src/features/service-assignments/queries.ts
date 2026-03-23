import { createClient } from '@/lib/supabase/server'
import type { ServiceAssignmentRow, ServiceAssignmentUserWithEmployee } from './types'

async function getSupabase() {
  return (await createClient()) as any
}

/** テナント内の全サービス割当を取得 */
export async function getServiceAssignmentsForAdmin(): Promise<ServiceAssignmentRow[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('service_assignments')
    .select('*')
    .order('service_type', { ascending: true })

  if (error || !data) return []
  return data as ServiceAssignmentRow[]
}

/** サービス割当1件を取得 */
export async function getServiceAssignmentById(
  id: string
): Promise<ServiceAssignmentRow | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('service_assignments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as ServiceAssignmentRow
}

/** サービス割当の対象ユーザー一覧を取得（従業員名結合） */
export async function getServiceAssignmentUsersWithEmployees(
  serviceAssignmentId: string
): Promise<ServiceAssignmentUserWithEmployee[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('service_assignments_users')
    .select(
      `
      id,
      tenant_id,
      service_assignment_id,
      employee_id,
      is_available,
      created_at,
      updated_at,
      employees(name)
    `
    )
    .eq('service_assignment_id', serviceAssignmentId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row: { employees?: { name: string | null } | null } & Record<string, unknown>) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    service_assignment_id: row.service_assignment_id,
    employee_id: row.employee_id,
    is_available: row.is_available,
    created_at: row.created_at,
    updated_at: row.updated_at,
    employee_name: row.employees?.name ?? null,
  })) as ServiceAssignmentUserWithEmployee[]
}
