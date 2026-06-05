import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { getExitInterviews, getExitInterviewAnalytics } from '@/features/exit-interview/queries'
import { ExitInterviewDashboard } from '@/features/exit-interview/components/ExitInterviewDashboard'

export const metadata = { title: '退職理由分析' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function ExitInterviewPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)
  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) redirect(APP_ROUTES.TENANT.ADMIN)

  const supabase = await createClient()

  const [records, analytics] = await Promise.all([
    getExitInterviews(supabase as any, user.tenant_id),
    getExitInterviewAnalytics(supabase as any, user.tenant_id),
  ])

  const { data: empRows } = await supabase
    .from('employees')
    .select('id, name, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .order('name')

  const employees = (empRows ?? []).map((e: any) => {
    const div = Array.isArray(e.divisions) ? e.divisions[0] : e.divisions
    return { id: e.id, name: e.name ?? '', department_name: div?.name ?? null }
  })

  return (
    <ExitInterviewDashboard
      records={records}
      analytics={analytics}
      employees={employees}
    />
  )
}
