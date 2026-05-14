import type { SupabaseClient } from '@supabase/supabase-js'
import type { GlobalJobCategory, GlobalJobRole, GlobalJobRoleDetail } from './types'

export async function getGlobalJobCategories(
  supabase: SupabaseClient
): Promise<GlobalJobCategory[]> {
  const { data, error } = await (supabase as any)
    .from('global_job_categories')
    .select('*')
    .order('sort_order')
    .order('created_at')
  if (error) return []
  return data ?? []
}

export async function getGlobalJobRoles(
  supabase: SupabaseClient,
  categoryId?: string
): Promise<GlobalJobRole[]> {
  let query = (supabase as any)
    .from('global_job_roles')
    .select('*, category:global_job_categories(name)')
    .order('sort_order')
    .order('created_at')
  if (categoryId) query = query.eq('category_id', categoryId)
  const { data, error } = await query
  if (error) return []
  return (data ?? []).map((r: any) => ({
    ...r,
    category_name: r.category?.name ?? null,
    category: undefined,
  }))
}

export async function getGlobalJobRoleDetail(
  supabase: SupabaseClient,
  roleId: string
): Promise<GlobalJobRoleDetail | null> {
  const [roleRes, itemsRes, levelsRes] = await Promise.all([
    (supabase as any)
      .from('global_job_roles')
      .select('*, category:global_job_categories(name)')
      .eq('id', roleId)
      .single(),
    (supabase as any)
      .from('global_skill_items')
      .select('*')
      .eq('job_role_id', roleId)
      .order('sort_order')
      .order('created_at'),
    (supabase as any)
      .from('global_skill_levels')
      .select('*')
      .eq('job_role_id', roleId)
      .order('sort_order')
      .order('created_at'),
  ])
  if (roleRes.error || !roleRes.data) return null
  return {
    ...roleRes.data,
    category_name: roleRes.data.category?.name ?? null,
    category: undefined,
    skillItems: itemsRes.data ?? [],
    skillLevels: levelsRes.data ?? [],
  }
}
