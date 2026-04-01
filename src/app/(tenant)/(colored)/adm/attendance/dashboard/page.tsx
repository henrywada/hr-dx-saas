import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getJSTYearMonth } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import {
  getAttendanceDashboardBundle,
  getUnresolvedAlertsList,
} from '@/features/attendance/actions'
import { canAccessHrAttendanceDashboard } from '@/features/attendance/hr-dashboard-access'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import AttendanceDashboard from './components/AttendanceDashboard'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parseHighlightEmployeeId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined
  }
  const t = raw.trim()
  return UUID_RE.test(t) ? t : undefined
}

function parseYearMonth(search: { year?: string; month?: string } | undefined): {
  year: number
  month: number
} {
  const fallback = getJSTYearMonth()
  const [fy, fm] = fallback.split('-').map(Number)
  const y = search?.year != null ? Number(search.year) : fy
  const m = search?.month != null ? Number(search.month) : fm
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return { year: fy, month: fm }
  }
  return { year: y, month: m }
}

export default async function AttendanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; highlightEmployeeId?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  if (!canAccessHrAttendanceDashboard(user)) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const sp = await searchParams
  const { year, month } = parseYearMonth(sp)

  const bundle = await getAttendanceDashboardBundle(year, month)
  const alerts = await getUnresolvedAlertsList(10)

  if (bundle.ok === false) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertTitle>データを読み込めませんでした</AlertTitle>
          <AlertDescription>
            {bundle.error}
            <br />
            勤怠関連テーブル（work_time_records / overtime_monthly_stats / overtime_alerts）が存在しないか、権限が不足している可能性があります。
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (alerts.ok === false) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertTitle>アラートを読み込めませんでした</AlertTitle>
          <AlertDescription>{alerts.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: divs, error: divErr } = await supabase
    .from('divisions')
    .select('id, name')
    .order('name', { ascending: true })

  if (divErr) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertTitle>部署一覧を取得できませんでした</AlertTitle>
          <AlertDescription>{divErr.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const divisions = (divs ?? []) as { id: string; name: string }[]

  const highlightId = parseHighlightEmployeeId(sp.highlightEmployeeId)
  let initialDetailEmployee: { id: string; name: string } | null = null
  if (highlightId) {
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { count: wtrCount, error: wtrCntErr } = await supabase
      .from('work_time_records')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', user.tenant_id)
      .eq('employee_id', highlightId)
      .gte('record_date', periodStart)
      .lte('record_date', periodEnd)

    if (!wtrCntErr && (wtrCount ?? 0) > 0) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id, name')
        .eq('tenant_id', user.tenant_id)
        .eq('id', highlightId)
        .maybeSingle()
      if (emp?.id) {
        initialDetailEmployee = {
          id: emp.id,
          name: (emp.name ?? '').trim() || '—',
        }
      }
    }
  }

  return (
    <AttendanceDashboard
      year={year}
      month={month}
      overview={bundle.data.overview}
      alertsPreview={alerts.data}
      initialList={bundle.data.initialList}
      divisions={divisions}
      initialDetailEmployee={initialDetailEmployee}
    />
  )
}
