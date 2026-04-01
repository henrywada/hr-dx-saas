import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { canAccessHrAttendanceDashboard } from '@/features/attendance/hr-dashboard-access'
import { APP_ROUTES } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import {
  fetchMonthlyClosureListWithCounts,
  suggestedOldestOpenYearMonth,
} from '@/lib/overtime/closure-list'
import { ClosureListClient } from './components/ClosureListClient'

export default async function ClosureManagementPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }
  if (!canAccessHrAttendanceDashboard(user)) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const supabase = await createClient()
  const result = await fetchMonthlyClosureListWithCounts(supabase, user.tenant_id)

  if (result.ok === false) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <ClosureListClient initialItems={[]} loadError={result.error} suggestedYearMonth={null} />
      </div>
    )
  }

  const suggestedYearMonth = suggestedOldestOpenYearMonth(result.items)

  return (
    <div className="mx-auto max-w-6xl p-6">
      <ClosureListClient initialItems={result.items} suggestedYearMonth={suggestedYearMonth} />
    </div>
  )
}
