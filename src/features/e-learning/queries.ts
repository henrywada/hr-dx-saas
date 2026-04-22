import { createClient } from '@/lib/supabase/server'
import type {
  ElCourse,
  ElCourseWithSlides,
  ElAssignment,
  ElCourseViewerData,
  ElSlideProgress,
  ElChecklistCompletion,
} from './types'

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
  if (error) throw error
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
  if (error) throw error
  return (data ?? []) as ElCourse[]
}

export async function getCourseWithSlides(courseId: string): Promise<ElCourseWithSlides | null> {
  const supabase = await createClient()

  const { data: course, error: courseError } = await supabase
    .from('el_courses')
    .select('*')
    .eq('id', courseId)
    .maybeSingle()

  if (courseError) throw courseError
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

  if (slidesError) throw slidesError

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
      employee:employees!el_assignments_employee_id_fkey ( id, name, division_id )
    `
    )
    .order('assigned_at', { ascending: false })

  if (courseId) query = query.eq('course_id', courseId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ElAssignment[]
}

export async function getEmployeesForAssignment() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('employees')
    .select('id, name, division_id')
    .order('name', { ascending: true })

  if (error) throw error
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
        id, title, description, category, status, estimated_minutes
      ),
      progress:el_progress ( id, slide_id, status, completed_at )
    `
    )
    .eq('employee_id', employeeId)
    .order('assigned_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as (ElAssignment & {
    completed_at: string | null
    course: ElCourse
    progress: ElSlideProgress[]
  })[]
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

  if (assignmentError) throw assignmentError
  if (!assignment) return null

  const courseWithSlides = await getCourseWithSlides(assignment.course_id)
  if (!courseWithSlides) return null

  const { data: progress, error: progressError } = await supabase
    .from('el_progress')
    .select(
      'id, assignment_id, slide_id, status, quiz_score, scenario_branch_id, selected_choice_text, completed_at'
    )
    .eq('assignment_id', assignmentId)

  if (progressError) throw progressError

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

  if (error) throw error
  return (data ?? []) as ElChecklistCompletion[]
}
