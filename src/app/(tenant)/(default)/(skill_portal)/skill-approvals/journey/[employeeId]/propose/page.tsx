import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { verifyManagerAccess } from '@/features/skill-portal/queries'
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

  const { data: emp } = await (supabase as any)
    .from('employees')
    .select('name')
    .eq('id', employeeId)
    .single()
  const { data: skills } = await (supabase as any)
    .from('tenant_skills')
    .select('id, name')
    .eq('tenant_id', user.tenant_id)
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <ProposeGoalForm
        employeeId={employeeId}
        employeeName={emp?.name ?? null}
        tenantSkills={skills ?? []}
      />
    </div>
  )
}
