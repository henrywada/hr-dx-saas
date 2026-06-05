import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getOneOnOneDashboardData } from '@/features/one-on-one/queries'
import { seedDefaultThemeTemplates } from '@/features/one-on-one/actions'
import { OneOnOneDashboard } from '@/features/one-on-one/components/OneOnOneDashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '1on1支援機能' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function OneOnOnePage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  // テーマテンプレートが空の場合にデフォルトをシード（冪等）
  await seedDefaultThemeTemplates()

  const supabase = await createClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .eq('is_manager', false)
    .order('name')

  const employeeList = (employees ?? []).map(e => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)
    return { id: e.id, name: e.name ?? '', department_name: deptName }
  })

  const data = await getOneOnOneDashboardData()

  return <OneOnOneDashboard data={data} employees={employeeList} />
}
