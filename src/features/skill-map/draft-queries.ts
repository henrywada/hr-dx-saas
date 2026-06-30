import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'

export interface SkillMapDraftRow {
  id: string
  name: string
  status: string
  created_at: string
  created_by_name: string | null
  employee_count: number | null
  avg_completion_rate: number | null
}

export async function getSkillMapDrafts(): Promise<SkillMapDraftRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('skill_map_drafts')
    .select('id, name, status, created_at, snapshot, employees:created_by(name)')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error || !data) return []

  return (data as any[]).map(row => {
    const snap = (row.snapshot ?? {}) as Record<string, unknown>
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      created_at: row.created_at,
      created_by_name: row.employees?.name ?? null,
      employee_count: typeof snap.employeeCount === 'number' ? snap.employeeCount : null,
      avg_completion_rate: typeof snap.avgCompletionRate === 'number' ? snap.avgCompletionRate : null,
    }
  })
}
