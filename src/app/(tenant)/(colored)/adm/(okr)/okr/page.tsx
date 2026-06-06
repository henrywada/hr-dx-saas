import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { getOkrDashboardData, getAchievementRateByDivision } from '@/features/okr/queries'
import { OkrDashboard } from '@/features/okr/components/OkrDashboard'

export const metadata = { title: 'OKR・目標管理' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']
const ADMIN_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function OkrPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const currentYear = new Date().getFullYear()

  const [data, divisionAchievements] = await Promise.all([
    getOkrDashboardData(currentYear),
    getAchievementRateByDivision(currentYear),
  ])

  const supabase = await createClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .order('name')

  const employeeList = (employees ?? []).map(e => ({
    id: e.id,
    name: e.name ?? '',
  }))

  const isAdmin = ADMIN_ROLES.includes(user.appRole ?? '')

  return (
    <OkrDashboard
      data={data}
      fiscalYear={currentYear}
      isAdmin={isAdmin}
      employees={employeeList}
      divisionAchievements={divisionAchievements}
    />
  )
}
