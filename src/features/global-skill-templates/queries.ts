import type { SupabaseClient } from '@supabase/supabase-js'
import type { GlobalSkillLevel, GlobalSkillLevelSet, GlobalSkillLevelSetWithLevels } from './types'

/** スキルレベルセットをすべて取得（レベルネスト） */
export async function getGlobalSkillLevelSetsWithLevels(
  supabase: SupabaseClient
): Promise<GlobalSkillLevelSetWithLevels[]> {
  const { data: sets, error } = await (supabase as any)
    .from('global_skill_level_sets')
    .select('*')
    .order('sort_order')
    .order('created_at')
  if (error) {
    console.warn('[getGlobalSkillLevelSetsWithLevels] sets select failed:', error.message)
    return []
  }
  const rows = (sets ?? []) as GlobalSkillLevelSet[]
  if (rows.length === 0) return []

  const setIds = rows.map(s => s.id)
  const { data: lvRows, error: lvErr } = await (supabase as any)
    .from('global_skill_levels')
    .select('*')
    .in('skill_level_set_id', setIds)
    .order('sort_order')
    .order('created_at')
  if (lvErr) {
    console.warn('[getGlobalSkillLevelSetsWithLevels] levels select failed:', lvErr.message)
  }
  const levels = (lvRows ?? []) as GlobalSkillLevel[]

  const levelsBySet = new Map<string, GlobalSkillLevel[]>()
  for (const lv of levels) {
    const list = levelsBySet.get(lv.skill_level_set_id) ?? []
    list.push(lv)
    levelsBySet.set(lv.skill_level_set_id, list)
  }

  return rows.map(s => ({
    ...s,
    levels: levelsBySet.get(s.id) ?? [],
  }))
}
