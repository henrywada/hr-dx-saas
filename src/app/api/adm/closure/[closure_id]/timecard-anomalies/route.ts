import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 月次締めに紐づく対象月の打刻異常一覧（RPC detect_timecard_anomalies）
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ closure_id: string }> },
) {
  const { closure_id } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  const { data: closure, error: closureErr } = await supabase
    .from('monthly_overtime_closures')
    .select('id, tenant_id, year_month')
    .eq('id', closure_id)
    .maybeSingle()

  if (closureErr) {
    return NextResponse.json({ error: closureErr.message }, { status: 500 })
  }
  if (!closure) {
    return NextResponse.json({ error: '締めが見つかりません' }, { status: 404 })
  }

  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (empErr || !emp?.tenant_id) {
    return NextResponse.json({ error: '従業員情報を取得できません' }, { status: 403 })
  }
  if (emp.tenant_id !== closure.tenant_id) {
    return NextResponse.json({ error: 'この締めにアクセスできません' }, { status: 403 })
  }

  const { data: rpcData, error: rpcErr } = await supabase.rpc('detect_timecard_anomalies', {
    p_tenant_id: closure.tenant_id,
    p_year_month: closure.year_month,
  })

  if (rpcErr) {
    console.error('detect_timecard_anomalies', rpcErr)
    return NextResponse.json(
      { error: '異常検出の実行に失敗しました。マイグレーション未適用の可能性があります。' },
      { status: 500 },
    )
  }

  const rows = rpcData ?? []
  const empIds = [...new Set(rows.map((r) => r.employee_id))]
  let nameById: Record<string, string> = {}
  if (empIds.length > 0) {
    const { data: names, error: nameErr } = await supabase
      .from('employees')
      .select('id, name')
      .eq('tenant_id', closure.tenant_id)
      .in('id', empIds)
    if (!nameErr && names) {
      nameById = Object.fromEntries(names.map((e) => [e.id, e.name]))
    }
  }

  const items = rows.map((r) => ({
    ...r,
    employee_name: nameById[r.employee_id] ?? '（不明）',
  }))

  return NextResponse.json({
    closure: {
      id: closure.id,
      year_month: closure.year_month,
      tenant_id: closure.tenant_id,
    },
    items,
  })
}
