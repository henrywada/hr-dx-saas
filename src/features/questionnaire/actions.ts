'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import type { CreateQuestionnaireInput, AnswerInput } from './types'

interface ActionResult {
  success: boolean
  error?: string
  id?: string
}

/**
 * システムテンプレートをテナント版にコピー
 * テンプレートのセクション・設問・選択肢・評価項目をすべてコピーして、新規アンケートを作成
 */
export async function copyQuestionnareTemplate(templateId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // テンプレート取得
  const { data: template, error: tErr } = await db
    .from('questionnaires')
    .select('*')
    .eq('id', templateId)
    .eq('creator_type', 'system')
    .single()

  if (tErr || !template) {
    return { success: false, error: 'テンプレートが見つかりません。' }
  }

  // 従業員情報取得
  const { data: employee, error: eErr } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (eErr || !employee) {
    return { success: false, error: '従業員情報が見つかりません。' }
  }

  // 新規アンケート作成（自社版）
  const { data: newQ, error: nqErr } = await db
    .from('questionnaires')
    .insert({
      creator_type: 'tenant',
      tenant_id: user.tenant_id,
      title: template.title,
      description: template.description,
      status: 'draft',
      created_by_employee_id: employee.id,
    })
    .select('id')
    .single()

  if (nqErr || !newQ) {
    return { success: false, error: 'アンケートの作成に失敗しました。' }
  }

  const newQuestionnaireId = newQ.id

  try {
    // セクション取得
    const { data: sections, error: sErr } = await db
      .from('questionnaire_sections')
      .select('*')
      .eq('questionnaire_id', templateId)
      .order('sort_order', { ascending: true })

    if (sErr) throw new Error('セクション取得エラー')

    // セクションCOPY
    const sectionMap = new Map<string, string>()
    for (const section of sections || []) {
      const { data: newS, error: nsErr } = await db
        .from('questionnaire_sections')
        .insert({
          questionnaire_id: newQuestionnaireId,
          title: section.title,
          sort_order: section.sort_order,
        })
        .select('id')
        .single()

      if (nsErr || !newS) throw new Error('セクション作成エラー')
      sectionMap.set(section.id, newS.id)
    }

    // 設問取得
    const { data: questions, error: qErr } = await db
      .from('questionnaire_questions')
      .select('*')
      .eq('questionnaire_id', templateId)
      .order('sort_order', { ascending: true })

    if (qErr) throw new Error('設問取得エラー')

    // 設問・選択肢・評価項目COPY
    const questionMap = new Map<string, string>()
    for (const question of questions || []) {
      const { data: newQq, error: nqqErr } = await db
        .from('questionnaire_questions')
        .insert({
          questionnaire_id: newQuestionnaireId,
          section_id: question.section_id ? sectionMap.get(question.section_id) : null,
          question_type: question.question_type,
          question_text: question.question_text,
          scale_labels: question.scale_labels,
          is_required: question.is_required,
          sort_order: question.sort_order,
        })
        .select('id')
        .single()

      if (nqqErr || !newQq) throw new Error('設問作成エラー')
      questionMap.set(question.id, newQq.id)

      // 選択肢COPY
      const { data: options } = await db
        .from('questionnaire_question_options')
        .select('*')
        .eq('question_id', question.id)

      if (options && options.length > 0) {
        await db.from('questionnaire_question_options').insert(
          options.map(o => ({
            question_id: newQq.id,
            option_text: o.option_text,
            sort_order: o.sort_order,
          }))
        )
      }

      // 評価項目COPY
      const { data: items } = await db
        .from('questionnaire_question_items')
        .select('*')
        .eq('question_id', question.id)

      if (items && items.length > 0) {
        await db.from('questionnaire_question_items').insert(
          items.map(i => ({
            question_id: newQq.id,
            item_text: i.item_text,
            sort_order: i.sort_order,
          }))
        )
      }
    }

    revalidatePath('/adm/Survey')
    return { success: true, id: newQuestionnaireId }
  } catch (err) {
    // エラー時：作成途中のアンケート削除
    await db.from('questionnaires').delete().eq('id', newQuestionnaireId)
    return { success: false, error: 'テンプレートのコピーに失敗しました。' }
  }
}

/**
 * アンケートを設問・選択肢込みで一括作成
 */
export async function createQuestionnaire(input: CreateQuestionnaireInput): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  if (input.creator_type === 'system' && user.appRole !== 'developer') {
    return { success: false, error: 'システム区分のアンケートは開発者のみ作成できます。' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!employee) return { success: false, error: '従業員情報が見つかりません。' }

  // アンケートマスタ作成
  const { data: qData, error: qErr } = await db
    .from('questionnaires')
    .insert({
      creator_type: input.creator_type,
      tenant_id: input.creator_type === 'system' ? null : user.tenant_id,
      title: input.title,
      description: input.description ?? null,
      status: 'draft',
      created_by_employee_id: employee.id,
    })
    .select('id')
    .single()

  if (qErr || !qData) {
    return { success: false, error: qErr?.message ?? 'アンケートの作成に失敗しました。' }
  }

  const questionnaireId = qData.id
  let globalSortOrder = 0

  // セクション・設問を順番に挿入
  for (const section of input.sections) {
    let sectionId: string | null = null

    if (section.title) {
      const { data: sData, error: sErr } = await db
        .from('questionnaire_sections')
        .insert({
          questionnaire_id: questionnaireId,
          title: section.title,
          sort_order: section.sort_order,
        })
        .select('id')
        .single()

      if (sErr || !sData) {
        return { success: false, error: 'セクションの作成に失敗しました。' }
      }
      sectionId = sData.id
    }

    for (const q of section.questions) {
      const { data: qqData, error: qqErr } = await db
        .from('questionnaire_questions')
        .insert({
          questionnaire_id: questionnaireId,
          section_id: sectionId,
          question_type: q.question_type,
          question_text: q.question_text,
          scale_labels: q.scale_labels ?? null,
          is_required: q.is_required,
          sort_order: globalSortOrder++,
        })
        .select('id')
        .single()

      if (qqErr || !qqData) {
        return { success: false, error: '設問の作成に失敗しました。' }
      }

      const questionId = qqData.id

      if (q.options && q.options.length > 0) {
        const { error: oErr } = await db
          .from('questionnaire_question_options')
          .insert(q.options.map(o => ({ question_id: questionId, ...o })))
        if (oErr) return { success: false, error: '選択肢の作成に失敗しました。' }
      }

      if (q.items && q.items.length > 0) {
        const { error: iErr } = await db
          .from('questionnaire_question_items')
          .insert(q.items.map(it => ({ question_id: questionId, ...it })))
        if (iErr) return { success: false, error: '評価項目の作成に失敗しました。' }
      }
    }
  }

  revalidatePath('/adm/Survey')
  return { success: true, id: questionnaireId }
}

/**
 * アンケートの基本情報を更新（タイトル・説明・ステータス）
 */
export async function updateQuestionnaire(
  id: string,
  input: { title?: string; description?: string; status?: 'draft' | 'active' | 'closed' }
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from('questionnaires')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/adm/Survey')
  return { success: true }
}

/**
 * アンケートを削除（draft のみ）
 */
export async function deleteQuestionnaire(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // status=draft の確認は RLS ポリシー側で実施
  const { error } = await db.from('questionnaires').delete().eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/adm/Survey')
  return { success: true }
}

/**
 * 従業員にアンケートをアサイン
 */
export async function assignEmployees(
  questionnaireId: string,
  employeeIds: string[],
  deadlineDate?: string | null
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  if (employeeIds.length === 0) {
    return { success: false, error: '対象従業員を選択してください。' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const rows = employeeIds.map(eid => ({
    questionnaire_id: questionnaireId,
    tenant_id: user.tenant_id,
    employee_id: eid,
    deadline_date: deadlineDate ?? null,
  }))

  const { error } = await db
    .from('questionnaire_assignments')
    .upsert(rows, { onConflict: 'questionnaire_id,employee_id', ignoreDuplicates: true })

  if (error) return { success: false, error: error.message }

  revalidatePath('/adm/Survey')
  return { success: true }
}

/**
 * アサインを削除（アンケートの対象から除外）
 */
export async function removeAssignment(
  questionnaireId: string,
  employeeId: string
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db
    .from('questionnaire_assignments')
    .delete()
    .eq('questionnaire_id', questionnaireId)
    .eq('employee_id', employeeId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/adm/Survey')
  return { success: true }
}

/**
 * 回答を提出
 * 未提出の response がなければ新規作成、あれば更新してから submitted_at を設定
 */
export async function submitAnswers(
  assignmentId: string,
  answers: AnswerInput[]
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id || !user.employee_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // アサイン確認
  const { data: assignment } = await db
    .from('questionnaire_assignments')
    .select('questionnaire_id, employee_id')
    .eq('id', assignmentId)
    .single()

  if (!assignment || assignment.employee_id !== user.employee_id) {
    return { success: false, error: '無効なアサインです。' }
  }

  // 回答セッション取得または作成
  let responseId: string
  const { data: existingResponse } = await db
    .from('questionnaire_responses')
    .select('id, submitted_at')
    .eq('assignment_id', assignmentId)
    .single()

  if (existingResponse?.submitted_at) {
    return { success: false, error: 'すでに提出済みです。' }
  }

  if (existingResponse?.id) {
    responseId = existingResponse.id
    // 既存回答を削除して入れ直す
    await db.from('questionnaire_answers').delete().eq('response_id', responseId)
  } else {
    const { data: newResponse, error: rErr } = await db
      .from('questionnaire_responses')
      .insert({
        questionnaire_id: assignment.questionnaire_id,
        assignment_id: assignmentId,
        employee_id: user.employee_id,
        tenant_id: user.tenant_id,
      })
      .select('id')
      .single()

    if (rErr || !newResponse) {
      return { success: false, error: '回答セッションの作成に失敗しました。' }
    }
    responseId = newResponse.id
  }

  // 回答詳細を挿入
  if (answers.length > 0) {
    const { error: aErr } = await db.from('questionnaire_answers').insert(
      answers.map(a => ({
        response_id: responseId,
        question_id: a.question_id,
        item_id: a.item_id ?? null,
        option_id: a.option_id ?? null,
        text_answer: a.text_answer ?? null,
        score: a.score ?? null,
      }))
    )
    if (aErr) return { success: false, error: '回答の保存に失敗しました。' }
  }

  // 提出完了
  const { error: submitErr } = await db
    .from('questionnaire_responses')
    .update({ submitted_at: new Date().toISOString() })
    .eq('id', responseId)

  if (submitErr) return { success: false, error: '提出処理に失敗しました。' }

  revalidatePath('/answers')
  return { success: true }
}

/**
 * アンケートのステータス変更（管理画面用ショートカット）
 */
export async function changeQuestionnaireStatus(
  id: string,
  status: 'draft' | 'active' | 'closed'
): Promise<ActionResult> {
  return updateQuestionnaire(id, { status })
}

/**
 * 設問を追加（既存アンケートに単独追加）
 */
export async function addQuestion(
  questionnaireId: string,
  input: {
    section_id?: string | null
    question_type: string
    question_text: string
    scale_labels?: string[] | null
    is_required: boolean
    sort_order: number
    options?: { option_text: string; sort_order: number }[]
    items?: { item_text: string; sort_order: number }[]
  }
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: qqData, error: qqErr } = await db
    .from('questionnaire_questions')
    .insert({
      questionnaire_id: questionnaireId,
      section_id: input.section_id ?? null,
      question_type: input.question_type,
      question_text: input.question_text,
      scale_labels: input.scale_labels ?? null,
      is_required: input.is_required,
      sort_order: input.sort_order,
    })
    .select('id')
    .single()

  if (qqErr || !qqData) {
    return { success: false, error: qqErr?.message ?? '設問の追加に失敗しました。' }
  }

  const questionId = qqData.id

  if (input.options && input.options.length > 0) {
    await db
      .from('questionnaire_question_options')
      .insert(input.options.map(o => ({ question_id: questionId, ...o })))
  }

  if (input.items && input.items.length > 0) {
    await db
      .from('questionnaire_question_items')
      .insert(input.items.map(it => ({ question_id: questionId, ...it })))
  }

  revalidatePath('/adm/Survey')
  return { success: true, id: questionId }
}

/**
 * 設問を削除
 */
export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user) return { success: false, error: '認証エラー：ログインしてください。' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { error } = await db.from('questionnaire_questions').delete().eq('id', questionId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/adm/Survey')
  return { success: true }
}

/**
 * 設問を更新（テキスト・選択肢・評価項目）
 */
export async function updateQuestion(
  questionId: string,
  input: {
    question_text?: string
    is_required?: boolean
    scale_labels?: string[] | null
    options?: { id?: string; option_text: string; sort_order: number }[]
    items?: { id?: string; item_text: string; sort_order: number }[]
  }
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user) return { success: false, error: '認証エラー：ログインしてください。' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const updatePayload: Record<string, unknown> = {}
  if (input.question_text !== undefined) updatePayload.question_text = input.question_text
  if (input.is_required !== undefined) updatePayload.is_required = input.is_required
  if (input.scale_labels !== undefined) updatePayload.scale_labels = input.scale_labels

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await db
      .from('questionnaire_questions')
      .update(updatePayload)
      .eq('id', questionId)
    if (error) return { success: false, error: error.message }
  }

  if (input.options !== undefined) {
    await db.from('questionnaire_question_options').delete().eq('question_id', questionId)
    if (input.options.length > 0) {
      const { error } = await db.from('questionnaire_question_options').insert(
        input.options.map(o => ({
          question_id: questionId,
          option_text: o.option_text,
          sort_order: o.sort_order,
        }))
      )
      if (error) return { success: false, error: error.message }
    }
  }

  if (input.items !== undefined) {
    await db.from('questionnaire_question_items').delete().eq('question_id', questionId)
    if (input.items.length > 0) {
      const { error } = await db.from('questionnaire_question_items').insert(
        input.items.map(it => ({
          question_id: questionId,
          item_text: it.item_text,
          sort_order: it.sort_order,
        }))
      )
      if (error) return { success: false, error: error.message }
    }
  }

  revalidatePath('/adm/Survey')
  return { success: true }
}

/**
 * セクションを追加
 */
export async function addSection(
  questionnaireId: string,
  title: string,
  sortOrder: number
): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user) return { success: false, error: '認証エラー：ログインしてください。' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('questionnaire_sections')
    .insert({ questionnaire_id: questionnaireId, title, sort_order: sortOrder })
    .select('id')
    .single()

  if (error || !data)
    return { success: false, error: error?.message ?? 'セクション追加に失敗しました。' }

  revalidatePath('/adm/Survey')
  return { success: true, id: data.id }
}

/**
 * アンケート詳細取得（設問・選択肢・評価項目を含む）- Server Action
 */
export async function getQuestionnaireDetailAction(
  id: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const user = await getServerUser()
  if (!user) return { success: false, error: '認証エラー：ログインしてください。' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: q, error: qErr } = await db.from('questionnaires').select('*').eq('id', id).single()

  if (qErr || !q) return { success: false, error: 'アンケートが見つかりません。' }

  const { data: sections } = await db
    .from('questionnaire_sections')
    .select('*')
    .eq('questionnaire_id', id)
    .order('sort_order')

  const { data: questions } = await db
    .from('questionnaire_questions')
    .select('*')
    .eq('questionnaire_id', id)
    .order('sort_order')

  const questionIds: string[] = (questions ?? []).map((qq: { id: string }) => qq.id)

  let options: { question_id: string; id: string; option_text: string; sort_order: number }[] = []
  let items: { question_id: string; id: string; item_text: string; sort_order: number }[] = []

  if (questionIds.length > 0) {
    const { data: optData } = await db
      .from('questionnaire_question_options')
      .select('*')
      .in('question_id', questionIds)
      .order('sort_order')
    options = optData ?? []

    const { data: itemData } = await db
      .from('questionnaire_question_items')
      .select('*')
      .in('question_id', questionIds)
      .order('sort_order')
    items = itemData ?? []
  }

  const questionsWithDetails = (questions ?? []).map(
    (qq: {
      id: string
      questionnaire_id: string
      section_id: string | null
      question_type: string
      question_text: string
      scale_labels: string[] | null
      is_required: boolean
      sort_order: number
    }) => ({
      ...qq,
      options: options.filter(o => o.question_id === qq.id),
      items: items.filter(it => it.question_id === qq.id),
    })
  )

  return {
    success: true,
    data: {
      ...q,
      sections: sections ?? [],
      questions: questionsWithDetails,
    },
  }
}
