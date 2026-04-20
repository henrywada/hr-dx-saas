'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { PulseSurveyCadence } from '@/lib/datetime'
import { persistTenantPulseSurveyCadence } from '@/lib/server/pulse-survey-cadence-persistence'
import type { CreateEchoTemplateInput, UpdateEchoTemplateInput, CreateQuestionInput } from './types'

interface ActionResult {
  success: boolean
  error?: string
  id?: string
}

// ─── SaaS admin 操作（createAdminClient 使用） ───────────────────────────────

/** Echoテンプレートを新規作成 */
export async function createEchoTemplate(input: CreateEchoTemplateInput): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('questionnaires')
    .insert({
      creator_type: 'system',
      tenant_id: null,
      purpose: 'echo',
      title: input.title,
      description: input.description ?? null,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.SAAS.ECHO_TEMPLATE)
  return { success: true, id: data.id }
}

/** Echoテンプレートのタイトル・説明を更新 */
export async function updateEchoTemplate(
  id: string,
  input: UpdateEchoTemplateInput
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('questionnaires')
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('creator_type', 'system')
    .eq('purpose', 'echo')

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.SAAS.ECHO_TEMPLATE)
  return { success: true }
}

/** Echoテンプレートを削除 */
export async function deleteEchoTemplate(id: string): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('questionnaires')
    .delete()
    .eq('id', id)
    .eq('creator_type', 'system')
    .eq('purpose', 'echo')

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.SAAS.ECHO_TEMPLATE)
  return { success: true }
}

/** テンプレートに設問を追加 */
export async function addEchoTemplateQuestion(
  templateId: string,
  input: CreateQuestionInput
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { data: q, error } = await supabase
    .from('questionnaire_questions')
    .insert({
      questionnaire_id: templateId,
      section_id: null,
      question_type: input.question_type,
      question_text: input.question_text,
      scale_labels: input.scale_labels ?? null,
      is_required: input.is_required,
      sort_order: input.sort_order,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  if (input.options && input.options.length > 0) {
    const { error: optErr } = await supabase
      .from('questionnaire_question_options')
      .insert(input.options.map(o => ({ question_id: q.id, ...o })))
    if (optErr) return { success: false, error: optErr.message }
  }
  if (input.items && input.items.length > 0) {
    const { error: itemErr } = await supabase
      .from('questionnaire_question_items')
      .insert(input.items.map(i => ({ question_id: q.id, ...i })))
    if (itemErr) return { success: false, error: itemErr.message }
  }

  revalidatePath(APP_ROUTES.SAAS.ECHO_TEMPLATE)
  return { success: true, id: q.id }
}

/** テンプレートの設問を更新 */
export async function updateEchoTemplateQuestion(
  questionId: string,
  input: Partial<CreateQuestionInput>
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('questionnaire_questions')
    .update({
      ...(input.question_text !== undefined && { question_text: input.question_text }),
      ...(input.question_type !== undefined && { question_type: input.question_type }),
      ...(input.scale_labels !== undefined && { scale_labels: input.scale_labels }),
      ...(input.is_required !== undefined && { is_required: input.is_required }),
      ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
    })
    .eq('id', questionId)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.SAAS.ECHO_TEMPLATE)
  return { success: true }
}

/** テンプレートの設問を削除 */
export async function deleteEchoTemplateQuestion(questionId: string): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('questionnaire_questions').delete().eq('id', questionId)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.SAAS.ECHO_TEMPLATE)
  return { success: true }
}

// ─── テナント管理者操作（createClient + RLS 使用） ───────────────────────────

/** Echoテンプレートをテナント用にコピー（purpose='echo' を付与） */
export async function copyEchoTemplate(templateId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const supabase = await createClient()
  const db = supabase as any

  const { data: template, error: tErr } = await db
    .from('questionnaires')
    .select('title, description')
    .eq('id', templateId)
    .eq('creator_type', 'system')
    .eq('purpose', 'echo')
    .single()

  if (tErr || !template) return { success: false, error: 'テンプレートが見つかりません。' }

  const { data: employee, error: eErr } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (eErr || !employee) return { success: false, error: '従業員情報が見つかりません。' }

  const { data: newQ, error: nqErr } = await db
    .from('questionnaires')
    .insert({
      creator_type: 'tenant',
      tenant_id: user.tenant_id,
      purpose: 'echo',
      title: template.title,
      description: template.description,
      status: 'draft',
      created_by_employee_id: employee.id,
    })
    .select('id')
    .single()

  if (nqErr || !newQ) return { success: false, error: '設問セットの作成に失敗しました。' }

  const { data: srcQuestions, error: qErr } = await db
    .from('questionnaire_questions')
    .select('*, questionnaire_question_options(*), questionnaire_question_items(*)')
    .eq('questionnaire_id', templateId)
    .order('sort_order', { ascending: true })

  if (qErr) return { success: false, error: '設問の取得に失敗しました。' }

  for (const q of srcQuestions ?? []) {
    const { data: newQuestion, error: newQErr } = await db
      .from('questionnaire_questions')
      .insert({
        questionnaire_id: newQ.id,
        section_id: null,
        question_type: q.question_type,
        question_text: q.question_text,
        scale_labels: q.scale_labels,
        is_required: q.is_required,
        sort_order: q.sort_order,
      })
      .select('id')
      .single()

    if (newQErr || !newQuestion) continue

    if (q.questionnaire_question_options?.length > 0) {
      await db.from('questionnaire_question_options').insert(
        q.questionnaire_question_options.map((o: any) => ({
          question_id: newQuestion.id,
          option_text: o.option_text,
          sort_order: o.sort_order,
        }))
      )
    }
    if (q.questionnaire_question_items?.length > 0) {
      await db.from('questionnaire_question_items').insert(
        q.questionnaire_question_items.map((i: any) => ({
          question_id: newQuestion.id,
          item_text: i.item_text,
          sort_order: i.sort_order,
        }))
      )
    }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE)
  return { success: true, id: newQ.id }
}

/** 本番指定: パルス実施間隔を保存し、同テナントの他 echo 設問を draft に戻して指定IDを active に */
export async function activateEchoQuestionnaire(
  questionnaireId: string,
  pulseSurveyCadence: PulseSurveyCadence
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const allowed =
    user.appRole === 'hr' || user.appRole === 'hr_manager' || user.appRole === 'developer'
  if (!allowed) {
    return { success: false, error: '本番指定を行う権限がありません' }
  }

  if (pulseSurveyCadence !== 'monthly' && pulseSurveyCadence !== 'weekly') {
    return { success: false, error: '実施間隔の値が不正です' }
  }

  const persisted = await persistTenantPulseSurveyCadence(user.tenant_id, pulseSurveyCadence)
  if (persisted.ok === false) {
    return { success: false, error: persisted.error }
  }

  const supabase = await createClient()
  const db = supabase as any

  const { error: resetErr } = await db
    .from('questionnaires')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('tenant_id', user.tenant_id)
    .eq('creator_type', 'tenant')
    .eq('purpose', 'echo')
    .eq('status', 'active')

  if (resetErr) return { success: false, error: resetErr.message }

  const { data: activated, error: activateErr } = await db
    .from('questionnaires')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', questionnaireId)
    .eq('tenant_id', user.tenant_id)
    .eq('creator_type', 'tenant')
    .eq('purpose', 'echo')
    .select('id')
    .maybeSingle()

  if (activateErr) return { success: false, error: activateErr.message }
  if (!activated) {
    return {
      success: false,
      error:
        '本番指定できませんでした。人事担当（HR）権限があるか、対象の設問セットを確認してください。',
    }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE)
  revalidatePath('/survey/answer')
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}

/** 本番解除: active → draft */
export async function deactivateEchoQuestionnaire(questionnaireId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const supabase = await createClient()
  const db = supabase as any

  const { data: updated, error } = await db
    .from('questionnaires')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', questionnaireId)
    .eq('tenant_id', user.tenant_id)
    .eq('creator_type', 'tenant')
    .eq('purpose', 'echo')
    .eq('status', 'active')
    .select('id')
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!updated) {
    return {
      success: false,
      error:
        '本番解除できませんでした。人事担当（HR）権限があるか、設問セットが本番稼働中か確認してください。',
    }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE)
  revalidatePath('/survey/answer')
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}

/** テナント Echo 設問セットを削除（draft のみ可） */
export async function deleteTenantEchoQuestionnaire(
  questionnaireId: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const supabase = await createClient()
  const db = supabase as any

  const { error } = await db
    .from('questionnaires')
    .delete()
    .eq('id', questionnaireId)
    .eq('tenant_id', user.tenant_id)
    .eq('creator_type', 'tenant')
    .eq('purpose', 'echo')
    .eq('status', 'draft')

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE)
  return { success: true }
}

/** テナント Echo 設問セットの名称を更新（本番・下書きどちらも可） */
export async function updateTenantEchoQuestionnaireTitle(
  questionnaireId: string,
  title: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const trimmed = title.trim()
  if (!trimmed) return { success: false, error: '設問セット名を入力してください。' }

  const supabase = await createClient()
  const db = supabase as any

  const { error } = await db
    .from('questionnaires')
    .update({ title: trimmed, updated_at: new Date().toISOString() })
    .eq('id', questionnaireId)
    .eq('tenant_id', user.tenant_id)
    .eq('creator_type', 'tenant')
    .eq('purpose', 'echo')

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE)
  revalidatePath('/survey/answer')
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}
