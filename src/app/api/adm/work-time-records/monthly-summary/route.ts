import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { canAccessHrAttendanceDashboard } from '@/features/attendance/hr-dashboard-access'
import { yearMonthKeyFromRecordDate } from '@/lib/record-date-month-key'

const PAGE_SIZE = 1000

/**
 * work_time_records を暦月ごとに件数集計（RPC 未適用環境でも動作するようサーバーで集約）
 */
export async function GET() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }
  if (!canAccessHrAttendanceDashboard(user)) {
    return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !authUser) {
    return NextResponse.json({ error: 'セッションが無効です' }, { status: 401 })
  }

  const counts = new Map<string, number>()
  let offset = 0

  try {
    for (;;) {
      const { data, error } = await supabase
        .from('work_time_records')
        .select('record_date')
        .order('record_date', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1)

      if (error) {
        console.error('work_time_records monthly-summary', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!data?.length) {
        break
      }
      for (const row of data) {
        const rd = row.record_date
        const ym = yearMonthKeyFromRecordDate(rd)
        if (ym == null) {
          continue
        }
        counts.set(ym, (counts.get(ym) ?? 0) + 1)
      }
      if (data.length < PAGE_SIZE) {
        break
      }
      offset += PAGE_SIZE
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '集計に失敗しました'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const months = [...counts.entries()]
    .map(([ym, row_count]) => ({ year_month: `${ym}-01`, row_count }))
    .sort((a, b) => b.year_month.localeCompare(a.year_month))

  return NextResponse.json({ months })
}
