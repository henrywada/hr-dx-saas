import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { get360Campaigns } from '@/features/evaluation/360-queries'
import { CampaignDashboard } from '@/features/evaluation/components/360/CampaignDashboard'

export const metadata = { title: '360度評価' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function Evaluation360Page() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)
  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) redirect(APP_ROUTES.TENANT.ADMIN)

  const supabase = await createClient()

  const campaigns = await get360Campaigns(supabase as any, user.tenant_id)

  const { data: empRows } = await supabase
    .from('employees')
    .select('id, name, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .order('name')

  const employees = (empRows ?? []).map((e: any) => {
    const div = Array.isArray(e.divisions) ? e.divisions[0] : e.divisions
    return { id: e.id, name: e.name ?? '', department_name: div?.name ?? null }
  })

  return <CampaignDashboard campaigns={campaigns} employees={employees} />
}
