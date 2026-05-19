import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getHrPendingRoleApplications,
  getHrPendingRequirementApplications,
} from '@/features/skill-portal/queries'
import { HrApplicationsView } from '@/features/skill-portal/components/HrApplicationsView'

export default async function SkillApplicationsPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()

  const [roleApplications, requirementApplications] = await Promise.all([
    getHrPendingRoleApplications(supabase),
    getHrPendingRequirementApplications(supabase),
  ])

  return (
    <div className="min-h-full">
      <div className="px-6 pb-6 pt-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
            <h1 className="text-[1.35rem] font-bold text-gray-900 sm:text-[1.65rem]">
              スキル申請 最終承認
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              上長承認済みの申請を最終承認するとスキルマップに自動反映されます
            </p>
          </div>
          <div className="p-6">
            <HrApplicationsView
              roleApplications={roleApplications}
              requirementApplications={requirementApplications}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
