import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getTenantSkillsWithRequirements, getEmployeeSkillAssignments } from '@/features/skill-map/queries'
import {
  getMyRoleApplications,
  getMyRequirementApplications,
  getMyApprovers,
} from '@/features/skill-portal/queries'
import { MySkillsView } from '@/features/skill-portal/components/MySkillsView'

export default async function MySkillsPage() {
  const user = await getServerUser()
  if (!user || !user.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()

  const [skills, currentAssignments, roleApplications, requirementApplications, approvers] =
    await Promise.all([
      getTenantSkillsWithRequirements(supabase),
      getEmployeeSkillAssignments(supabase, user.employee_id),
      getMyRoleApplications(supabase, user.employee_id),
      getMyRequirementApplications(supabase, user.employee_id),
      getMyApprovers(supabase, user.employee_id),
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
        />
      </div>
    </div>
  )
}
