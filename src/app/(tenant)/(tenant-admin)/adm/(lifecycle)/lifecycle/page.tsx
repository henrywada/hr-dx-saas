import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getLifecycleDashboardData } from '@/features/lifecycle/queries'
import { seedDefaultTaskTemplates } from '@/features/lifecycle/actions'
import { LifecycleDashboard } from '@/features/lifecycle/components/LifecycleDashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '入退社ライフサイクルワークフロー' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function LifecyclePage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  // テンプレートが空の場合にデフォルトをシード（冪等）
  await seedDefaultTaskTemplates()

  const supabase = await createClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .order('name')

  const employeeList = (employees ?? []).map(e => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData) ? (divData[0]?.name ?? null) : (divData?.name ?? null)
    return { id: e.id, name: e.name ?? '', department_name: deptName }
  })

  const data = await getLifecycleDashboardData()

  return <LifecycleDashboard data={data} employees={employeeList} />
}
