import { createClient } from '@/lib/supabase/server'
import type {
  QuestionnaireListItem,
  QuestionnaireDetail,
  QuestionWithDetails,
  AssignedQuestionnaire,
  QuestionnaireStatus,
} from './types'

/**
 * 自社版アンケート一覧取得（管理画面用）
 * 指定テナントの自社版アンケートのみを返す
 */
export async function getQuestionnaires(tenantId: string): Promise<QuestionnaireListItem[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('questionnaires')
    .select(
      `
      id, creator_type, tenant_id, title, description, status,
      created_by_employee_id, created_at, updated_at,
      question_count:questionnaire_questions(count),
      assignments:questionnaire_assignments(count),
      submitted:questionnaire_responses(count)
    `
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(
    (row: {
      id: string
      creator_type: string
      tenant_id: string | null
      title: string
      description: string | null
      status: string
      created_by_employee_id: string | null
      created_at: string
      updated_at: string
      question_count: { count: number }[]
      assignments: { count: number }[]
      submitted: { count: number }[]
    }) => ({
      id: row.id,
      creator_type: row.creator_type,
      tenant_id: row.tenant_id,
      title: row.title,
      description: row.description,
      status: row.status,
      created_by_employee_id: row.created_by_employee_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      question_count: row.question_count?.[0]?.count ?? 0,
      assignment_count: row.assignments?.[0]?.count ?? 0,
      submitted_count: row.submitted?.[0]?.count ?? 0,
    })
  )
}

/**
 * システムテンプレート一覧取得
 * 全テナントがアクセス可能なテンプレートアンケート一覧を返す
 */
export async function getTemplates(): Promise<QuestionnaireListItem[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('questionnaires')
    .select(
      `
      id, creator_type, tenant_id, title, description, status,
      created_by_employee_id, created_at, updated_at,
      question_count:questionnaire_questions(count),
      assignments:questionnaire_assignments(count),
      submitted:questionnaire_responses(count)
    `
    )
    .eq('creator_type', 'system')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(
    (row: {
      id: string
      creator_type: string
      tenant_id: string | null
      title: string
      description: string | null
      status: string
      created_by_employee_id: string | null
      created_at: string
      updated_at: string
      question_count: { count: number }[]
      assignments: { count: number }[]
      submitted: { count: number }[]
    }) => ({
      id: row.id,
      creator_type: row.creator_type,
      tenant_id: row.tenant_id,
      title: row.title,
      description: row.description,
      status: row.status,
      created_by_employee_id: row.created_by_employee_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      question_count: row.question_count?.[0]?.count ?? 0,
      assignment_count: row.assignments?.[0]?.count ?? 0,
      submitted_count: row.submitted?.[0]?.count ?? 0,
    })
  )
}

/**
 * アンケート詳細取得（設問・選択肢・評価項目を含む）
 */
export async function getQuestionnaireDetail(id: string): Promise<QuestionnaireDetail | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: q, error: qErr } = await db.from('questionnaires').select('*').eq('id', id).single()

  if (qErr || !q) return null

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

  const questionsWithDetails: QuestionWithDetails[] = (questions ?? []).map(
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
    ...q,
    sections: sections ?? [],
    questions: questionsWithDetails,
  }
}

/** PostgREST の 1:1 embed は配列ではなく単一オブジェクトで返ることがある */
function submittedAtFromEmbeddedResponse(
  response:
    | { submitted_at: string | null }
    | { submitted_at: string | null }[]
    | null
): string | null {
  if (response == null) return null
  if (Array.isArray(response)) return response[0]?.submitted_at ?? null
  return response.submitted_at ?? null
}

function embedQuestionnaireRow(
  q:
    | {
        id: string
        title: string
        description: string | null
        creator_type: string
        status: string
      }
    | {
        id: string
        title: string
        description: string | null
        creator_type: string
        status: string
      }[]
    | null
): {
  id: string
  title: string
  description: string | null
  creator_type: string
  status: QuestionnaireStatus
} | null {
  if (q == null) return null
  const row = Array.isArray(q) ? q[0] : q
  if (!row) return null
  const status = row.status as QuestionnaireStatus
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    creator_type: row.creator_type,
    status,
  }
}

/**
 * 自分にアサインされたアンケート一覧（回答画面用）
 */
export async function getAssignedQuestionnaires(
  employeeId: string
): Promise<AssignedQuestionnaire[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data, error } = await db
    .from('questionnaire_assignments')
    .select(
      `
      id,
      questionnaire_id,
      deadline_date,
      assigned_at,
      questionnaire:questionnaires(id, title, description, creator_type, status),
      response:questionnaire_responses(submitted_at)
    `
    )
    .eq('employee_id', employeeId)
    .order('assigned_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(
    (row: {
      id: string
      questionnaire_id: string
      deadline_date: string | null
      assigned_at: string
      questionnaire:
        | {
            id: string
            title: string
            description: string | null
            creator_type: string
            status: string
          }
        | {
            id: string
            title: string
            description: string | null
            creator_type: string
            status: string
          }[]
        | null
      response:
        | { submitted_at: string | null }
        | { submitted_at: string | null }[]
        | null
    }) => {
      const meta = embedQuestionnaireRow(row.questionnaire)
      return {
        assignment_id: row.id,
        questionnaire_id: row.questionnaire_id,
        title: meta?.title ?? '',
        description: meta?.description ?? null,
        deadline_date: row.deadline_date,
        assigned_at: row.assigned_at,
        submitted_at: submittedAtFromEmbeddedResponse(row.response),
        creator_type: (meta?.creator_type ?? 'tenant') as AssignedQuestionnaire['creator_type'],
        questionnaire_status: meta?.status ?? 'draft',
      }
    }
  )
}

/**
 * 回答フォーム用のフルデータ取得（アサインIDから）
 */
export async function getQuestionnaireForAnswer(
  assignmentId: string,
  employeeId: string
): Promise<{
  detail: QuestionnaireDetail
  responseId: string | null
  existingAnswers: {
    question_id: string
    item_id: string | null
    option_id: string | null
    text_answer: string | null
    score: number | null
  }[]
} | null> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: assignment, error: aErr } = await db
    .from('questionnaire_assignments')
    .select('questionnaire_id, employee_id')
    .eq('id', assignmentId)
    .single()

  if (aErr || !assignment || assignment.employee_id !== employeeId) return null

  const detail = await getQuestionnaireDetail(assignment.questionnaire_id)
  if (!detail) return null

  const { data: response } = await db
    .from('questionnaire_responses')
    .select('id')
    .eq('assignment_id', assignmentId)
    .single()

  let existingAnswers: {
    question_id: string
    item_id: string | null
    option_id: string | null
    text_answer: string | null
    score: number | null
  }[] = []

  if (response?.id) {
    const { data: answers } = await db
      .from('questionnaire_answers')
      .select('question_id, item_id, option_id, text_answer, score')
      .eq('response_id', response.id)
    existingAnswers = answers ?? []
  }

  return {
    detail,
    responseId: response?.id ?? null,
    existingAnswers,
  }
}

/**
 * アンケートのアサイン対象従業員一覧（アサインモーダル用）
 */
export async function getAssignedEmployeeIds(questionnaireId: string): Promise<string[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from('questionnaire_assignments')
    .select('employee_id')
    .eq('questionnaire_id', questionnaireId)

  return (data ?? []).map((row: { employee_id: string }) => row.employee_id)
}

/**
 * 回答統計（管理画面の一覧用補助）
 */
export async function getQuestionnaireStats(
  questionnaireId: string,
  tenantId: string
): Promise<{ assignment_count: number; submitted_count: number }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { count: assignment_count } = await db
    .from('questionnaire_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('questionnaire_id', questionnaireId)
    .eq('tenant_id', tenantId)

  const { count: submitted_count } = await db
    .from('questionnaire_responses')
    .select('id', { count: 'exact', head: true })
    .eq('questionnaire_id', questionnaireId)
    .eq('tenant_id', tenantId)
    .not('submitted_at', 'is', null)

  return {
    assignment_count: assignment_count ?? 0,
    submitted_count: submitted_count ?? 0,
  }
}
