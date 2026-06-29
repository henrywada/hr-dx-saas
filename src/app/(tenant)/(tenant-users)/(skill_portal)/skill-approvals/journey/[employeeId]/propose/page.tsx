import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { verifyManagerAccess, getProposeGoalData } from '@/features/skill-portal/queries'
import { ProposeGoalForm } from '@/features/skill-portal/components/ProposeGoalForm'

interface Props {
  params: Promise<{ employeeId: string }>
}

export default async function ProposePage({ params }: Props) {
  const { employeeId } = await params
  const user = await getServerUser()
  if (!user?.employee_id) return notFound()

  const supabase = await createClient()
  const hasAccess = await verifyManagerAccess(supabase, user.employee_id, employeeId)
  if (!hasAccess) return notFound()

  const { employeeName, tenantSkills } = await getProposeGoalData(
    supabase,
    user.tenant_id!,
    employeeId
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <ProposeGoalForm
        employeeId={employeeId}
        employeeName={employeeName}
        tenantSkills={tenantSkills}
      />
    </div>
  )
}
