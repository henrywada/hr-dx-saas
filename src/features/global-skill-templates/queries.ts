import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  GlobalSkillTemplate,
  GlobalSkillCategory,
  GlobalSkill,
} from '@/features/skill-map/types'

type DB = SupabaseClient

/** 全グローバルテンプレート（is_active問わず） */
export async function getAllGlobalTemplates(supabase: DB): Promise<GlobalSkillTemplate[]> {
  const { data, error } = await supabase
    .from('global_skill_templates')
    .select('*')
    .order('industry_type')
  if (error) throw error
  return data ?? []
}

/** テンプレートに紐づくカテゴリ・スキル */
export async function getTemplateDetail(
  supabase: DB,
  templateId: string
): Promise<{ categories: GlobalSkillCategory[]; skills: GlobalSkill[] }> {
  const [catRes, skillRes] = await Promise.all([
    supabase
      .from('global_skill_categories')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order'),
    supabase.from('global_skills').select('*').eq('template_id', templateId).order('sort_order'),
  ])
  if (catRes.error) throw catRes.error
  if (skillRes.error) throw skillRes.error
  return { categories: catRes.data ?? [], skills: skillRes.data ?? [] }
}
