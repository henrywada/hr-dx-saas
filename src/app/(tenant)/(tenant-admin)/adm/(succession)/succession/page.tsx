import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getSuccessionDashboardData } from '@/features/succession-plan/queries'
import { SuccessionDashboard } from '@/features/succession-plan/components/SuccessionDashboard'
import { createClient } from '@/lib/supabase/server'
import { getRecentCareerDiscussionsForEmployees } from '@/features/career-discussions/queries'

export const metadata = { title: 'サクセッションプラン' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function SuccessionPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const supabase = await createClient()

  const { data: empRows } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .order('name')

  const employees = (empRows ?? []).map(e => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)
    return { id: e.id, name: e.name ?? '', department_name: deptName }
  })

  const { data: divRows } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('tenant_id', user.tenant_id)
    .order('name')

  const divisions = (divRows ?? []).map(d => ({ id: d.id, name: d.name }))

  const data = await getSuccessionDashboardData()

  const candidateEmployeeIds = [
    ...new Set(data.positions.flatMap(p => p.candidates.map(c => c.employee_id))),
  ]
  const careerDiscussionsByEmployee =
    await getRecentCareerDiscussionsForEmployees(candidateEmployeeIds)

  return (
    <SuccessionDashboard
      data={data}
      employees={employees}
      divisions={divisions}
      careerDiscussionsByEmployee={careerDiscussionsByEmployee}
    />
  )
}
