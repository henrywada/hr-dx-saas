import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getPendingRoleApplicationsForApprover,
  getPendingRequirementApplicationsForApprover,
} from '@/features/skill-portal/queries'
import { SkillApprovalsView } from '@/features/skill-portal/components/SkillApprovalsView'

export default async function SkillApprovalsPage() {
  const user = await getServerUser()
  if (!user || !user.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()

  const [roleApplications, requirementApplications] = await Promise.all([
    getPendingRoleApplicationsForApprover(supabase, user.employee_id),
    getPendingRequirementApplicationsForApprover(supabase, user.employee_id),
  ])

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-3xl px-6 pb-12 pt-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">スキル承認</h1>
          <p className="mt-1 text-sm text-gray-500">部下からのスキル申請を承認・却下できます</p>
        </div>
        <SkillApprovalsView
          roleApplications={roleApplications}
          requirementApplications={requirementApplications}
        />
      </div>
    </div>
  )
}
