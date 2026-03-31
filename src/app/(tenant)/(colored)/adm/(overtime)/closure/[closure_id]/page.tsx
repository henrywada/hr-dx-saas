import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { canAccessHrAttendanceDashboard } from '@/features/attendance/hr-dashboard-access'
import { createClient } from '@/lib/supabase/server'
import { APP_ROUTES } from '@/config/routes'
import { ClosureDetailClient } from './components/ClosureDetailClient'

export default async function ClosureDetailPage({
  params,
}: {
  params: Promise<{ closure_id: string }>
}) {
  const { closure_id } = await params
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }
  if (!canAccessHrAttendanceDashboard(user)) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const supabase = await createClient()
  const { data: closure, error } = await supabase
    .from('monthly_overtime_closures')
    .select('*')
    .eq('id', closure_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-red-700">締め情報の取得に失敗しました。</p>
        <Link href="/adm/closure" className="mt-4 inline-block text-primary hover:underline">
          一覧へ戻る
        </Link>
      </div>
    )
  }
  if (!closure) {
    notFound()
  }

  const { data: meoRows } = await supabase
    .from('monthly_employee_overtime')
    .select('*')
    .eq('closure_id', closure_id)
    .eq('tenant_id', user.tenant_id)
    .order('employee_id', { ascending: true })

  const ids = [...new Set((meoRows ?? []).map((r) => r.employee_id))]
  const nameById: Record<string, string> = {}
  if (ids.length > 0) {
    const { data: emps } = await supabase
      .from('employees')
      .select('id, name')
      .eq('tenant_id', user.tenant_id)
      .in('id', ids)
    for (const e of emps ?? []) {
      nameById[e.id] = e.name ?? '—'
    }
  }

  const aggregateRows = (meoRows ?? []).map((r) => ({
    ...r,
    employee_name: nameById[r.employee_id] ?? '—',
  }))

  return (
    <div className="mx-auto max-w-6xl p-6">
      <ClosureDetailClient closure={closure} aggregateRows={aggregateRows} />
    </div>
  )
}
