'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { QuestionnaireStatus } from '@/features/questionnaire/types'
import type { EchoTemplate, EchoTemplateDetail, TenantEchoQuestionnaire } from './types'

/** SaaS admin 用: creator_type='system' かつ purpose='echo' の全テンプレートを取得 */
export async function getEchoTemplates(): Promise<EchoTemplate[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('questionnaires')
    .select(
      `
      id, title, description, status, created_at, updated_at,
      question_count:questionnaire_questions(count)
    `
    )
    .eq('creator_type', 'system')
    .eq('purpose', 'echo')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    question_count: Array.isArray(row.question_count) ? (row.question_count[0]?.count ?? 0) : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

/** SaaS admin 用: テンプレート詳細（設問込み）を取得 */
export async function getEchoTemplateDetail(id: string): Promise<EchoTemplateDetail | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('questionnaires')
    .select(
      `
      id, title, description, status, created_at, updated_at,
      questionnaire_questions(
        id, questionnaire_id, section_id, question_type,
        question_text, scale_labels, is_required, sort_order,
        questionnaire_question_options(id, question_id, option_text, sort_order),
        questionnaire_question_items(id, question_id, item_text, sort_order)
      )
    `
    )
    .eq('id', id)
    .eq('creator_type', 'system')
    .eq('purpose', 'echo')
    .single()

  if (error) return null

  const questions = (data.questionnaire_questions ?? []).map((q: any) => ({
    id: q.id,
    questionnaire_id: q.questionnaire_id,
    section_id: q.section_id,
    question_type: q.question_type,
    question_text: q.question_text,
    scale_labels: q.scale_labels,
    is_required: q.is_required,
    sort_order: q.sort_order,
    options: q.questionnaire_question_options ?? [],
    items: q.questionnaire_question_items ?? [],
  }))

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    question_count: questions.length,
    created_at: data.created_at,
    updated_at: data.updated_at,
    questions,
  }
}

/** テナント管理者用: creator_type='tenant' かつ purpose='echo' のテナント設問セット一覧 */
export async function getTenantEchoQuestionnaires(
  tenantId: string
): Promise<TenantEchoQuestionnaire[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error }: { data: any[]; error: any } = await db
    .from('questionnaires')
    .select(
      `
      id, title, description, status, created_at, updated_at,
      question_count:questionnaire_questions(count)
    `
    )
    .eq('creator_type', 'tenant')
    .eq('purpose', 'echo')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as QuestionnaireStatus,
    question_count: Array.isArray(row.question_count) ? (row.question_count[0]?.count ?? 0) : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

/** テナント管理者用: テンプレート一覧（コピー選択画面用） */
export async function getEchoTemplatesForTenant(): Promise<EchoTemplate[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error }: { data: any[]; error: any } = await db
    .from('questionnaires')
    .select(
      `
      id, title, description, status, created_at, updated_at,
      question_count:questionnaire_questions(count)
    `
    )
    .eq('creator_type', 'system')
    .eq('purpose', 'echo')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as QuestionnaireStatus,
    question_count: Array.isArray(row.question_count) ? (row.question_count[0]?.count ?? 0) : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}
