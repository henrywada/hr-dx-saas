import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { ElAssignment, ElCourse } from './types'

export interface ElScormPackage {
  course_id: string
  tenant_id: string
  package_type: 'scorm_12' | 'xapi_launch'
  storage_prefix: string | null
  launch_path: string
  original_filename: string | null
  uploaded_at: string
}

export interface ElScormRuntime {
  assignment_id: string
  cmi_data: Record<string, string>
  lesson_status: string | null
  score_raw: string | null
  suspend_data: string | null
}

export interface ElXapiStatementRow {
  id: string
  verb_id: string
  activity_id: string | null
  result_score: number | null
  recorded_at: string
  employee_id: string
  assignment_id: string | null
}

export interface ScormPlayerData {
  assignment: ElAssignment & { completed_at: string | null }
  course: ElCourse
  package: ElScormPackage
  runtime: ElScormRuntime | null
}

export async function getScormPackageForCourse(courseId: string): Promise<ElScormPackage | null> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('el_scorm_packages')
    .select('*')
    .eq('course_id', courseId)
    .maybeSingle()
  return (data as ElScormPackage | null) ?? null
}

export async function getScormPlayerData(
  assignmentId: string,
  employeeId: string,
): Promise<ScormPlayerData | null> {
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from('el_assignments')
    .select('*')
    .eq('id', assignmentId)
    .eq('employee_id', employeeId)
    .maybeSingle()

  if (!assignment) return null

  const { data: course } = await supabase
    .from('el_courses')
    .select('*')
    .eq('id', assignment.course_id)
    .maybeSingle()

  if (!course) return null

  const pkg = await getScormPackageForCourse(assignment.course_id)
  if (!pkg) return null

  const { data: runtime } = await (supabase as any)
    .from('el_scorm_runtime')
    .select('assignment_id, cmi_data, lesson_status, score_raw, suspend_data')
    .eq('assignment_id', assignmentId)
    .maybeSingle()

  return {
    assignment: assignment as ElAssignment & { completed_at: string | null },
    course: course as ElCourse,
    package: pkg,
    runtime: runtime
      ? {
          ...runtime,
          cmi_data: (runtime.cmi_data as Record<string, string>) ?? {},
        }
      : null,
  }
}

export async function getXapiStatementsForCourse(courseId: string, limit = 50): Promise<ElXapiStatementRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data: assignments } = await supabase
    .from('el_assignments')
    .select('id')
    .eq('course_id', courseId)

  const assignmentIds = (assignments ?? []).map(a => a.id)
  if (assignmentIds.length === 0) return []

  const { data } = await (supabase as any)
    .from('el_xapi_statements')
    .select('id, verb_id, activity_id, result_score, recorded_at, employee_id, assignment_id')
    .in('assignment_id', assignmentIds)
    .order('recorded_at', { ascending: false })
    .limit(limit)

  return (data ?? []) as ElXapiStatementRow[]
}
