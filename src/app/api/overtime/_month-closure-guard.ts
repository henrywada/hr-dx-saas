import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { monthlyClosureBlocksOvertimeApproval } from '@/lib/overtime/month-closure'

/**
 * 申請の勤務日が属する月が月次締め（集計済以降）なら上長操作を拒否する
 */
export async function assertOvertimeApplicationMonthOpenForManagerAction(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  workDateYmd: string,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const ym = workDateYmd.slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return {
      ok: false,
      response: NextResponse.json({ error: '勤務日の形式が正しくありません' }, { status: 400 }),
    }
  }
  const yearMonthFirst = `${ym}-01`

  const { data, error } = await supabase
    .from('monthly_overtime_closures')
    .select('status')
    .eq('tenant_id', tenantId)
    .eq('year_month', yearMonthFirst)
    .maybeSingle()

  if (error) {
    console.error('monthly_overtime_closures manager guard', error)
    return {
      ok: false,
      response: NextResponse.json(
        { error: '月次締め状態の確認に失敗しました' },
        { status: 500 },
      ),
    }
  }

  if (monthlyClosureBlocksOvertimeApproval(data?.status)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '当該月は月次締め処理済みのため、この操作はできません' },
        { status: 409 },
      ),
    }
  }

  return { ok: true }
}
