import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getTenantSkillsWithRequirements,
  getEmployeeSkillAssignments,
  getEmployeeCareerGoals,
  getMappedCoursesForRequirements,
  getSkillLevels,
} from '@/features/skill-map/queries'
import {
  getMyRoleApplications,
  getMyRequirementApplications,
  getMyApprovers,
  getEmployeeSelfEvaluations,
  getRecommendedCourses,
  getSkillFeedbackComments,
} from '@/features/skill-portal/queries'
import { MySkillsView } from '@/features/skill-portal/components/MySkillsView'

async function getElAchievedRequirementIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string
): Promise<Set<string>> {
  const { data: completed } = await (supabase as any)
    .from('el_assignments')
    .select('course_id')
    .eq('employee_id', employeeId)
    .not('completed_at', 'is', null)

  if (!completed || completed.length === 0) return new Set()

  const courseIds = completed.map((a: any) => a.course_id)
  const { data: mappings } = await (supabase as any)
    .from('el_course_requirement_mappings')
    .select('requirement_id')
    .in('course_id', courseIds)

  return new Set((mappings ?? []).map((m: any) => m.requirement_id as string))
}

export default async function MySkillsPage() {
  const user = await getServerUser()
  if (!user || !user.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()

  const [
    skills,
    currentAssignments,
    roleApplications,
    requirementApplications,
    approvers,
    elAchievedIds,
    careerGoals,
    mappedCourses,
    selfEvaluations,
    recommendedCourses,
    feedbackComments,
    levels,
  ] = await Promise.all([
    getTenantSkillsWithRequirements(supabase),
    getEmployeeSkillAssignments(supabase, user.employee_id),
    getMyRoleApplications(supabase, user.employee_id),
    getMyRequirementApplications(supabase, user.employee_id),
    getMyApprovers(supabase, user.employee_id),
    getElAchievedRequirementIds(supabase, user.employee_id),
    getEmployeeCareerGoals(supabase, user.employee_id),
    getMappedCoursesForRequirements(supabase),
    getEmployeeSelfEvaluations(supabase, user.employee_id),
    getRecommendedCourses(supabase, user.employee_id),
    getSkillFeedbackComments(supabase, user.employee_id),
    getSkillLevels(supabase),
  ])

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-3xl px-6 pb-12 pt-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">マイスキル</h1>
          <p className="mt-1 text-sm text-gray-500">職種・要件の達成申請と申請状況を確認できます</p>
        </div>
        <MySkillsView
          skills={skills}
          currentAssignments={currentAssignments}
          roleApplications={roleApplications}
          requirementApplications={requirementApplications}
          hasApprover={approvers.length > 0}
          elAchievedRequirementIds={elAchievedIds}
          employeeId={user.employee_id}
          initialCareerGoals={careerGoals}
          mappedCourses={mappedCourses}
          selfEvaluations={selfEvaluations}
          recommendedCourses={recommendedCourses}
          feedbackComments={feedbackComments}
          levels={levels}
        />
      </div>
    </div>
  )
}
