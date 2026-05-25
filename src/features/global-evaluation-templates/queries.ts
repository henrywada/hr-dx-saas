import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  GlobalEvaluationTemplate,
  GlobalEvaluationTemplateItem,
  GlobalEvaluationTemplateWithItems,
} from './types'

/** グローバル評価テンプレート一覧（項目なし） */
export async function getGlobalEvaluationTemplates(
  supabase: SupabaseClient
): Promise<GlobalEvaluationTemplate[]> {
  const { data, error } = await (supabase as any)
    .from('global_evaluation_templates')
    .select('*')
    .order('sort_order')
    .order('created_at')
  if (error) {
    console.warn('[getGlobalEvaluationTemplates] failed:', error.message)
    return []
  }
  return (data ?? []) as GlobalEvaluationTemplate[]
}

/** グローバル評価テンプレート詳細（項目ネスト） */
export async function getGlobalEvaluationTemplateWithItems(
  supabase: SupabaseClient,
  templateId: string
): Promise<GlobalEvaluationTemplateWithItems | null> {
  const { data: tpl, error: tplErr } = await (supabase as any)
    .from('global_evaluation_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle()
  if (tplErr || !tpl) return null

  const { data: items, error: itemErr } = await (supabase as any)
    .from('global_evaluation_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order')
    .order('created_at')
  if (itemErr) {
    console.warn('[getGlobalEvaluationTemplateWithItems] items failed:', itemErr.message)
  }

  return {
    ...(tpl as GlobalEvaluationTemplate),
    items: (items ?? []) as GlobalEvaluationTemplateItem[],
  }
}
