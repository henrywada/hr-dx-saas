import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  GlobalJobCategory,
  GlobalJobRole,
  GlobalJobRoleDetail,
  GlobalSkillItem,
  GlobalSkillLevel,
  GlobalSkillLevelSet,
  GlobalSkillLevelSetWithLevels,
} from './types'

/** API 行を GlobalSkillItem に整形 */
function normalizeSkillItemRow(
  row: any,
  setById?: Map<string, Pick<GlobalSkillLevelSet, 'id' | 'name'>>
): GlobalSkillItem {
  const sid = row.skill_level_set_id ?? null
  return {
    ...row,
    skill_level_set_id: sid ?? '',
    skill_level_set: sid && setById ? setById.get(sid) ?? null : null,
  }
}

/** 一覧・ネスト取得後のスキル項目を並び順どおりに整列 */
function sortSkillItems(items: GlobalSkillItem[]): GlobalSkillItem[] {
  return [...items].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

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
    .select(
      `
      *,
      category:global_job_categories(name),
      global_skill_items(*)
    `
    )
    .order('sort_order')
    .order('created_at')
  if (categoryId) query = query.eq('category_id', categoryId)
  const { data, error } = await query
  if (error) {
    console.warn('[getGlobalJobRoles] select failed:', error.message)
    return []
  }

  const rows = (data ?? []) as any[]
  const allItems = rows.flatMap(r => r.global_skill_items ?? [])
  const setIds = [
    ...new Set(
      allItems.map((it: any) => it.skill_level_set_id).filter((id: string | null) => Boolean(id))
    ),
  ] as string[]

  const setById = new Map<string, Pick<GlobalSkillLevelSet, 'id' | 'name'>>()
  if (setIds.length > 0) {
    const { data: setRows, error: setErr } = await (supabase as any)
      .from('global_skill_level_sets')
      .select('id, name')
      .in('id', setIds)
    if (setErr) {
      console.warn('[getGlobalJobRoles] global_skill_level_sets fetch failed:', setErr.message)
    } else {
      for (const s of setRows ?? [])
        setById.set((s as any).id, { id: (s as any).id, name: (s as any).name })
    }
  }

  return rows.map((r: any) => {
    const { category, global_skill_items, ...rest } = r
    const skill_items = sortSkillItems(
      (global_skill_items ?? []).map((row: any) => normalizeSkillItemRow(row, setById))
    )
    return {
      ...rest,
      category_name: category?.name ?? null,
      skill_items,
    }
  })
}

export async function getGlobalJobRoleDetail(
  supabase: SupabaseClient,
  roleId: string
): Promise<GlobalJobRoleDetail | null> {
  const [roleRes, itemsRes, setsRes] = await Promise.all([
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
      .from('global_skill_level_sets')
      .select('*')
      .eq('job_role_id', roleId)
      .order('sort_order')
      .order('created_at'),
  ])
  if (roleRes.error || !roleRes.data) return null
  if (itemsRes.error) {
    console.warn('[getGlobalJobRoleDetail] items select failed:', itemsRes.error.message)
  }

  const sets = (setsRes.data ?? []) as GlobalSkillLevelSet[]
  const setIds = sets.map(s => s.id)

  let levels: GlobalSkillLevel[] = []
  if (setIds.length > 0) {
    const { data: lvRows, error: lvErr } = await (supabase as any)
      .from('global_skill_levels')
      .select('*')
      .in('skill_level_set_id', setIds)
      .order('sort_order')
      .order('created_at')
    if (lvErr) {
      console.warn('[getGlobalJobRoleDetail] levels select failed:', lvErr.message)
    } else {
      levels = (lvRows ?? []) as GlobalSkillLevel[]
    }
  }

  const levelsBySet = new Map<string, GlobalSkillLevel[]>()
  for (const lv of levels) {
    const list = levelsBySet.get(lv.skill_level_set_id) ?? []
    list.push(lv)
    levelsBySet.set(lv.skill_level_set_id, list)
  }

  const skillLevelSets: GlobalSkillLevelSetWithLevels[] = sets.map(s => ({
    ...s,
    levels: levelsBySet.get(s.id) ?? [],
  }))

  const setMetaById = new Map<string, Pick<GlobalSkillLevelSet, 'id' | 'name'>>()
  for (const s of sets) setMetaById.set(s.id, { id: s.id, name: s.name })

  const skillItems = (itemsRes.data ?? []).map((row: any) =>
    normalizeSkillItemRow(row, setMetaById)
  )

  return {
    ...roleRes.data,
    category_name: roleRes.data.category?.name ?? null,
    category: undefined,
    skillItems,
    skillLevelSets,
  }
}
