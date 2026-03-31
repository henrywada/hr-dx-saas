import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  work_time_record_id: z.string().uuid(),
  corrected_start_iso: z.string().min(1, '出勤時刻を入力してください'),
  corrected_end_iso: z.string().min(1, '退勤時刻を入力してください'),
  reason: z.string().min(1, '修正理由は必須です').max(2000),
})

/**
 * Step 3-A: 打刻修正（work_time_records 更新 + timecard_corrections 履歴）
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ closure_id: string }> },
) {
  const { closure_id } = await context.params
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON の解析に失敗しました' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '入力が不正です'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { work_time_record_id, corrected_start_iso, corrected_end_iso, reason } = parsed.data

  const start = new Date(corrected_start_iso)
  const end = new Date(corrected_end_iso)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: '日時の形式が正しくありません' }, { status: 400 })
  }
  if (end <= start) {
    return NextResponse.json({ error: '退勤は出勤より後である必要があります' }, { status: 400 })
  }

  const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))

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

  if (closureErr || !closure) {
    return NextResponse.json({ error: '締めが見つかりません' }, { status: 404 })
  }

  const { data: actor, error: actorErr } = await supabase
    .from('employees')
    .select('id, tenant_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (actorErr || !actor?.tenant_id || !actor.id) {
    return NextResponse.json({ error: '従業員情報を取得できません' }, { status: 403 })
  }
  if (actor.tenant_id !== closure.tenant_id) {
    return NextResponse.json({ error: 'この締めにアクセスできません' }, { status: 403 })
  }

  const { data: wtr, error: wtrErr } = await supabase
    .from('work_time_records')
    .select('id, tenant_id, employee_id, record_date, start_time, end_time')
    .eq('id', work_time_record_id)
    .maybeSingle()

  if (wtrErr || !wtr) {
    return NextResponse.json({ error: '打刻レコードが見つかりません' }, { status: 404 })
  }
  if (wtr.tenant_id !== closure.tenant_id) {
    return NextResponse.json({ error: '対象レコードのテナントが一致しません' }, { status: 403 })
  }

  if (wtr.record_date.slice(0, 7) !== closure.year_month.slice(0, 7)) {
    return NextResponse.json(
      { error: 'この打刻は当該締めの対象月外です' },
      { status: 400 },
    )
  }

  const { error: updErr } = await supabase
    .from('work_time_records')
    .update({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', work_time_record_id)
    .eq('tenant_id', closure.tenant_id)

  if (updErr) {
    console.error('work_time_records update', updErr)
    return NextResponse.json({ error: '打刻の更新に失敗しました' }, { status: 500 })
  }

  const { error: corrErr } = await supabase.from('timecard_corrections').insert({
    tenant_id: closure.tenant_id,
    employee_id: wtr.employee_id,
    work_date: wtr.record_date,
    original_clock_in: wtr.start_time,
    original_clock_out: wtr.end_time,
    corrected_clock_in: start.toISOString(),
    corrected_clock_out: end.toISOString(),
    reason: reason.trim(),
    corrected_by: actor.id,
    correction_source: 'adm_closure_timecard',
  })

  if (corrErr) {
    console.error('timecard_corrections insert', corrErr)
    return NextResponse.json({ error: '修正履歴の保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
