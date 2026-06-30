import { createClient } from '@/lib/supabase/server'
import type {
  ElCourse,
  ElCourseWithSlides,
  ElAssignment,
  ElCourseViewerData,
  ElSlideProgress,
  ElChecklistCompletion,
} from './types'

function supabaseQueryError(
  prefix: string,
  error: { message?: string; code?: string; details?: string | null } | null
): Error {
  const detail = error?.message ?? '不明なエラー'
  const code = error?.code ? ` [${error.code}]` : ''
  const extra = error?.details ? ` — ${error.details}` : ''
  return new Error(`${prefix}: ${detail}${code}${extra}`)
}

interface GetCoursesOptions {
  status?: string
  category?: string
}

export async function getCourses(options: GetCoursesOptions = {}): Promise<ElCourse[]> {
  const supabase = await createClient()

  let query = supabase
    .from('el_courses')
    .select('*')
    .eq('course_type', 'tenant')
    .order('created_at', { ascending: false })

  if (options.status) query = query.eq('status', options.status)
  if (options.category) query = query.eq('category', options.category)

  const { data, error } = await query
  if (error) throw supabaseQueryError('コース一覧の取得に失敗しました', error)
  return (data ?? []) as ElCourse[]
}

export async function getTemplateCourses(options: GetCoursesOptions = {}): Promise<ElCourse[]> {
  const supabase = await createClient()

  let query = supabase
    .from('el_courses')
    .select('*')
    .eq('course_type', 'template')
    .is('tenant_id', null)
    .order('created_at', { ascending: false })

  if (options.status) query = query.eq('status', options.status)
  if (options.category) query = query.eq('category', options.category)

  const { data, error } = await query
  if (error) throw supabaseQueryError('テンプレートコース一覧の取得に失敗しました', error)
  return (data ?? []) as ElCourse[]
}

export async function getCourseWithSlides(courseId: string): Promise<ElCourseWithSlides | null> {
  const supabase = await createClient()

  const { data: course, error: courseError } = await supabase
    .from('el_courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle()

  if (courseError) throw supabaseQueryError('コースの取得に失敗しました', courseError)
  if (!course) return null

  const { data: slides, error: slidesError } = await supabase
    .from('el_slides')
    .select(
      `
      *,
      el_quiz_questions (
        *,
        el_quiz_options ( * )
      ),
      el_scenario_branches ( * ),
      el_checklist_items ( * )
    `
    )
    .eq('course_id', courseId)
    .order('slide_order', { ascending: true })

  if (slidesError) throw supabaseQueryError('スライドの取得に失敗しました', slidesError)

  const slidesWithRelations = (slides ?? []).map(s => {
    const { el_quiz_questions, el_scenario_branches, el_checklist_items, ...slideFields } =
      s as any
    return {
      ...slideFields,
      quiz_questions: ((el_quiz_questions ?? []) as any[]).map((q: any) => ({
        ...q,
        options: ((q.el_quiz_options ?? []) as any[]).sort(
          (a: any, b: any) => a.option_order - b.option_order
        ),
      })),
      scenario_branches: ((el_scenario_branches ?? []) as any[]).sort(
        (a: any, b: any) => a.branch_order - b.branch_order
      ),
      checklist_items: ((el_checklist_items ?? []) as any[]).sort(
        (a: any, b: any) => a.item_order - b.item_order
      ),
    }
  })

  return { ...(course as ElCourse), slides: slidesWithRelations as any }
}

export async function getAssignments(courseId?: string): Promise<ElAssignment[]> {
  const supabase = await createClient()

  let query = supabase
    .from('el_assignments')
    .select(
      `
      *,
      course:el_courses ( id, title, category, status ),
      employee:employees!el_assignments_employee_id_fkey ( id, name, division_id, divisions ( name ) )
    `
    )
    .order('assigned_at', { ascending: false })

  if (courseId) query = query.eq('course_id', courseId)

  const { data, error } = await query
  if (error) throw supabaseQueryError('割り当て一覧の取得に失敗しました', error)
  return (data ?? []) as unknown as ElAssignment[]
}

export interface AssignmentProgress {
  /** 完了スライド数 */
  completed: number
  /** コース総スライド数 */
  total: number
  /** 進捗率（0-100、総スライド0件のときは0） */
  rate: number
  /** 全スライド完了済みか */
  isCompleted: boolean
}

/**
 * 割り当てごとの受講進捗を集計する（管理者の進捗一覧用）。
 * el_progress(status='completed') のスライド数 ÷ コースの総スライド数 で算出する。
 */
export async function getAssignmentProgressMap(
  assignments: { id: string; course_id: string }[]
): Promise<Record<string, AssignmentProgress>> {
  const result: Record<string, AssignmentProgress> = {}
  if (assignments.length === 0) return result

  const supabase = await createClient()
  const assignmentIds = assignments.map(a => a.id)
  const courseIds = Array.from(new Set(assignments.map(a => a.course_id)))

  // コース別の総スライド数
  const { data: slides, error: slidesError } = await supabase
    .from('el_slides')
    .select('id, course_id')
    .in('course_id', courseIds)
  if (slidesError) throw supabaseQueryError('スライド数の取得に失敗しました', slidesError)

  const totalByCourse: Record<string, number> = {}
  for (const s of slides ?? []) {
    const cid = (s as { course_id: string }).course_id
    totalByCourse[cid] = (totalByCourse[cid] ?? 0) + 1
  }

  // 割り当て別の完了スライド数
  const { data: progress, error: progressError } = await supabase
    .from('el_progress')
    .select('assignment_id, status')
    .in('assignment_id', assignmentIds)
    .eq('status', 'completed')
  if (progressError) throw supabaseQueryError('受講進捗の取得に失敗しました', progressError)

  const completedByAssignment: Record<string, number> = {}
  for (const p of progress ?? []) {
    const aid = (p as { assignment_id: string }).assignment_id
    completedByAssignment[aid] = (completedByAssignment[aid] ?? 0) + 1
  }

  for (const a of assignments) {
    const total = totalByCourse[a.course_id] ?? 0
    const completed = Math.min(completedByAssignment[a.id] ?? 0, total || Infinity)
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0
    result[a.id] = {
      completed,
      total,
      rate,
      isCompleted: total > 0 && completed >= total,
    }
  }

  return result
}

export async function getEmployeesForAssignment() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .select('id, name, division_id')
    .order('name', { ascending: true })

  if (error) throw supabaseQueryError('従業員一覧の取得に失敗しました', error)
  return data ?? []
}

// ============================================================
// 従業員向け受講クエリ
// ============================================================

export async function getMyAssignments(employeeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('el_assignments')
    .select(
      `
      *,
      course:el_courses!el_assignments_course_id_fkey (
        id, title, description, category, status, estimated_minutes,
        published_start_date, published_end_date
      ),
      progress:el_progress ( id, slide_id, status, completed_at )
    `
    )
    .eq('employee_id', employeeId)

  if (error) throw supabaseQueryError('自分の割り当ての取得に失敗しました', error)

  type Row = ElAssignment & {
    completed_at: string | null
    course: ElCourse
    progress: ElSlideProgress[]
  }

  const rows = (data ?? []) as unknown as Row[]
  /** マイコース一覧: el_courses.category → title（日本語は localeCompare） */
  rows.sort((a, b) => {
    const catA = a.course?.category ?? ''
    const catB = b.course?.category ?? ''
    const byCat = catA.localeCompare(catB, 'ja', { sensitivity: 'base' })
    if (byCat !== 0) return byCat
    const titleA = a.course?.title ?? ''
    const titleB = b.course?.title ?? ''
    return titleA.localeCompare(titleB, 'ja', { sensitivity: 'base' })
  })

  return rows
}

export async function getCourseViewerData(
  assignmentId: string,
  employeeId: string
): Promise<ElCourseViewerData | null> {
  const supabase = await createClient()

  const { data: assignment, error: assignmentError } = await supabase
    .from('el_assignments')
    .select('*')
    .eq('id', assignmentId)
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (assignmentError) throw supabaseQueryError('割り当ての取得に失敗しました', assignmentError)
  if (!assignment) return null

  const courseWithSlides = await getCourseWithSlides(assignment.course_id)
  if (!courseWithSlides) return null

  const { data: progress, error: progressError } = await supabase
    .from('el_progress')
    .select(
      'id, assignment_id, slide_id, status, quiz_score, scenario_branch_id, selected_choice_text, completed_at'
    )
    .eq('assignment_id', assignmentId)

  if (progressError) throw supabaseQueryError('進捗の取得に失敗しました', progressError)

  const checklistCompletions = await getChecklistCompletions(assignmentId)

  return {
    ...courseWithSlides,
    assignment: assignment as ElAssignment & { completed_at: string | null },
    progress: (progress ?? []) as ElSlideProgress[],
    checklistCompletions,
  }
}

// ============================================================
// チェックリスト完了記録クエリ
// ============================================================

export async function getChecklistCompletions(
  assignmentId: string
): Promise<ElChecklistCompletion[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('el_checklist_completions')
    .select('*')
    .eq('assignment_id', assignmentId)

  if (error) throw supabaseQueryError('チェックリスト完了の取得に失敗しました', error)
  return (data ?? []) as ElChecklistCompletion[]
}

// ============================================================
// スキル要件連携クエリ
// ============================================================

export async function getCourseRequirementMappings(courseId: string): Promise<
  Array<{ id: string; requirement_id: string; requirement: { id: string; name: string; skill: { id: string; name: string } } }>
> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('el_course_requirement_mappings')
    .select('id, requirement_id, requirement:skill_requirements(id, name, skill:tenant_skills(id, name))')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true })
  if (error) throw supabaseQueryError('スキル要件連携の取得に失敗しました', error)
  return data ?? []
}

export async function getAllSkillRequirements(): Promise<
  Array<{ id: string; name: string; skill_id: string; skill_name: string }>
> {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('skill_requirements')
    .select('id, name, skill:tenant_skills(id, name)')
    .order('name', { ascending: true })
  if (error) throw supabaseQueryError('スキル要件の取得に失敗しました', error)
  return ((data ?? []) as any[]).map((r: any) => ({
    id: r.id,
    name: r.name,
    skill_id: r.skill?.id ?? '',
    skill_name: r.skill?.name ?? '',
  }))
}
