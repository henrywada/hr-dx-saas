import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  TrainingPlanTemplateRow,
  TrainingEmployeePlanRow,
  TrainingProgressRow,
  TrainingPlanDashboardData,
} from './training-plan-types'
import type { EmployeeCompletionRow } from './types'

type DB = SupabaseClient<Database>

/** 育成計画テンプレート一覧をコース付きで取得する */
export async function getTrainingPlanTemplates(supabase: DB): Promise<TrainingPlanTemplateRow[]> {
  const { data: templates, error } = await (supabase as any)
    .from('training_plan_templates')
    .select('id, skill_id, name, description')
    .eq('is_active', true)
    .order('sort_order')

  if (error || !templates || templates.length === 0) return []

  const templateIds = templates.map((t: any) => t.id)

  // コース情報を一括取得
  const { data: tpCourses } = await (supabase as any)
    .from('training_plan_template_courses')
    .select('template_id, course_id, sort_order')
    .in('template_id', templateIds)
    .order('sort_order')

  const courseIds = [...new Set((tpCourses ?? []).map((c: any) => c.course_id as string))]
  const { data: courses } =
    courseIds.length > 0
      ? await (supabase as any).from('el_courses').select('id, title, category').in('id', courseIds)
      : { data: [] }
  const courseMap = new Map((courses ?? []).map((c: any) => [c.id, c]))

  // 職種名を一括取得
  const skillIds = [...new Set(templates.map((t: any) => t.skill_id).filter(Boolean))] as string[]
  const { data: skills } =
    skillIds.length > 0
      ? await (supabase as any).from('tenant_skills').select('id, name').in('id', skillIds)
      : { data: [] }
  const skillMap = new Map((skills ?? []).map((s: any) => [s.id, s.name as string]))

  // テンプレートごとにコースをグループ化
  const coursesByTemplate = new Map<string, { id: string; title: string; category: string }[]>()
  for (const tc of tpCourses ?? []) {
    const course = courseMap.get(tc.course_id)
    if (!course) continue
    const arr = coursesByTemplate.get(tc.template_id) ?? []
    arr.push({
      id: (course as any).id,
      title: (course as any).title,
      category: (course as any).category,
    })
    coursesByTemplate.set(tc.template_id, arr)
  }

  return templates.map((t: any) => ({
    id: t.id,
    skill_id: t.skill_id,
    skill_name: t.skill_id ? (skillMap.get(t.skill_id) ?? null) : null,
    name: t.name,
    description: t.description,
    courses: coursesByTemplate.get(t.id) ?? [],
  }))
}

/** 個人育成計画一覧をコース完了進捗付きで取得する */
export async function getEmployeeTrainingPlans(supabase: DB): Promise<TrainingEmployeePlanRow[]> {
  const { data: plans, error } = await (supabase as any)
    .from('employee_training_plans')
    .select('id, employee_id, template_id, due_date, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error || !plans || plans.length === 0) return []

  // 従業員情報を一括取得
  const employeeIds = [...new Set(plans.map((p: any) => p.employee_id as string))]
  const { data: employees } = await (supabase as any)
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', employeeIds)
  const empMap = new Map(
    (employees ?? []).map((e: any) => {
      const divData = e.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)
      return [e.id, { name: e.name ?? '', deptName }]
    })
  )

  // テンプレート情報を一括取得
  const templateIds = [...new Set(plans.map((p: any) => p.template_id as string))]
  const { data: templates } = await (supabase as any)
    .from('training_plan_templates')
    .select('id, name')
    .in('id', templateIds)
  const templateMap = new Map((templates ?? []).map((t: any) => [t.id, t.name as string]))

  // テンプレートコースを一括取得
  const { data: tpCourses } = await (supabase as any)
    .from('training_plan_template_courses')
    .select('template_id, course_id')
    .in('template_id', templateIds)
  const coursesByTemplate = new Map<string, string[]>()
  for (const tc of tpCourses ?? []) {
    const arr = coursesByTemplate.get(tc.template_id) ?? []
    arr.push(tc.course_id)
    coursesByTemplate.set(tc.template_id, arr)
  }

  // eラーニング完了状況を一括取得
  const allCourseIds = [...new Set((tpCourses ?? []).map((c: any) => c.course_id as string))]
  const { data: assignments } =
    allCourseIds.length > 0
      ? await (supabase as any)
          .from('el_assignments')
          .select('employee_id, course_id, completed_at')
          .in('employee_id', employeeIds)
          .in('course_id', allCourseIds)
      : { data: [] }
  const completionSet = new Set(
    (assignments ?? [])
      .filter((a: any) => a.completed_at)
      .map((a: any) => `${a.employee_id}:${a.course_id}`)
  )

  return plans.map((p: any) => {
    const emp = empMap.get(p.employee_id)
    const courses = coursesByTemplate.get(p.template_id) ?? []
    const completed = courses.filter(cid => completionSet.has(`${p.employee_id}:${cid}`)).length

    return {
      id: p.id,
      employee_id: p.employee_id,
      employee_name: (emp as any)?.name ?? '',
      department_name: (emp as any)?.deptName ?? null,
      template_id: p.template_id,
      template_name: templateMap.get(p.template_id) ?? '',
      due_date: p.due_date,
      created_at: p.created_at,
      total_courses: courses.length,
      completed_courses: completed,
    }
  })
}

/** 全従業員の学習進捗レポートを取得する */
export async function getTrainingProgressRows(
  supabase: DB,
  completionRows: EmployeeCompletionRow[]
): Promise<TrainingProgressRow[]> {
  // スキル要件充足率（既存データ）
  const completionMap = new Map(
    completionRows.map(r => [
      r.employee_id,
      {
        total: r.totalRequirements,
        completed: r.completedRequirements,
        rate: r.completionRate,
      },
    ])
  )

  // 全従業員を取得
  const { data: employees } = await (supabase as any)
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('active_status', 'active')
    .order('name')
  if (!employees) return []

  const employeeIds = employees.map((e: any) => e.id as string)

  // e-learning アサイン一覧（全コース）
  const { data: assignments } = await (supabase as any)
    .from('el_assignments')
    .select('employee_id, completed_at')
    .in('employee_id', employeeIds)
  const elByEmployee = new Map<string, { total: number; completed: number }>()
  for (const a of assignments ?? []) {
    const curr = elByEmployee.get(a.employee_id) ?? { total: 0, completed: 0 }
    elByEmployee.set(a.employee_id, {
      total: curr.total + 1,
      completed: curr.completed + (a.completed_at ? 1 : 0),
    })
  }

  // 直近の育成計画テンプレート名
  const { data: plans } = await (supabase as any)
    .from('employee_training_plans')
    .select('employee_id, template_id, created_at')
    .in('employee_id', employeeIds)
    .order('created_at', { ascending: false })
  const latestPlanByEmployee = new Map<string, string>()
  for (const p of plans ?? []) {
    if (!latestPlanByEmployee.has(p.employee_id)) {
      latestPlanByEmployee.set(p.employee_id, p.template_id)
    }
  }
  const planTemplateIds = [...new Set([...latestPlanByEmployee.values()])]
  const { data: planTemplates } =
    planTemplateIds.length > 0
      ? await (supabase as any)
          .from('training_plan_templates')
          .select('id, name')
          .in('id', planTemplateIds)
      : { data: [] }
  const planTemplateMap = new Map((planTemplates ?? []).map((t: any) => [t.id, t.name as string]))

  return employees.map((e: any) => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)

    const el = elByEmployee.get(e.id) ?? { total: 0, completed: 0 }
    const skill = completionMap.get(e.id)
    const latestTemplateId = latestPlanByEmployee.get(e.id)

    return {
      employee_id: e.id,
      employee_name: e.name ?? '',
      department_name: deptName,
      el_total: el.total,
      el_completed: el.completed,
      el_rate: el.total > 0 ? Math.round((el.completed / el.total) * 100) : 0,
      skill_total: skill?.total ?? 0,
      skill_completed: skill?.completed ?? 0,
      skill_rate: skill?.rate ?? null,
      active_plan_name: latestTemplateId ? (planTemplateMap.get(latestTemplateId) ?? null) : null,
    }
  })
}

/** コースピッカー用: テナントの非アーカイブコース一覧 */
export async function getAvailableCoursesForPlan(
  supabase: DB
): Promise<{ id: string; title: string; category: string }[]> {
  const { data } = await (supabase as any)
    .from('el_courses')
    .select('id, title, category')
    .eq('course_type', 'tenant')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
  return (data ?? []).map((c: any) => ({
    id: c.id,
    title: c.title,
    category: c.category,
  }))
}

/** ダッシュボード用データをまとめて取得する */
export async function getTrainingPlanDashboardData(
  supabase: DB,
  completionRows: EmployeeCompletionRow[]
): Promise<TrainingPlanDashboardData> {
  const [templates, plans, progressRows, availableCourses] = await Promise.all([
    getTrainingPlanTemplates(supabase),
    getEmployeeTrainingPlans(supabase),
    getTrainingProgressRows(supabase, completionRows),
    getAvailableCoursesForPlan(supabase),
  ])

  return { templates, plans, progressRows, availableCourses }
}
