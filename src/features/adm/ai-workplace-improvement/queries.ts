/**
 * AI職場改善提案 — クエリ
 *
 * workplace_improvement_plans テーブルへのアクセス
 */

import { createClient } from '@/lib/supabase/server'

async function getSupabase() {
  return (await createClient()) as any
}

export type ImprovementPlan = {
  id: string
  tenant_id: string
  division_id: string | null
  division_name?: string | null
  source_analysis_id: string | null
  ai_generated_title: string
  ai_reason: string
  proposed_actions: string[]
  priority: '高' | '中' | '低'
  status: string
  registered_by: string | null
  expected_effect: string | null
  manual_ref: string | null
  follow_up_date: string | null
  actual_effect_score: number | null
  created_at: string
  updated_at: string
}

/** 登録済み職場改善計画一覧（テナント内、作成日降順） */
export async function getImprovementPlans(tenantId: string): Promise<ImprovementPlan[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('workplace_improvement_plans')
    .select('*, divisions(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[AI職場改善] getImprovementPlans error:', error)
    throw error
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    proposed_actions: Array.isArray(row.proposed_actions) ? row.proposed_actions : [],
    division_name: (row.divisions as { name?: string } | null)?.name ?? null,
  })) as ImprovementPlan[]
}

/** フォロー日が過ぎた計画（効果測定対象） */
export async function getPlansForFollowUp(tenantId: string): Promise<ImprovementPlan[]> {
  const supabase = await getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('workplace_improvement_plans')
    .select('*')
    .eq('tenant_id', tenantId)
    .not('follow_up_date', 'is', null)
    .lte('follow_up_date', today)
    .order('follow_up_date', { ascending: false })

  if (error) {
    console.error('[AI職場改善] getPlansForFollowUp error:', error)
    throw error
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    proposed_actions: Array.isArray(row.proposed_actions) ? row.proposed_actions : [],
  })) as ImprovementPlan[]
}
