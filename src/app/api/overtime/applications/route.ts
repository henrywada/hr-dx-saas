import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const bodySchema = z.object({
  work_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '勤務日の形式が正しくありません'),
  overtime_start: z.string().min(1, '残業開始時刻が必要です'),
  overtime_end: z.string().min(1, '残業終了時刻が必要です'),
  reason: z
    .string()
    .min(1, '残業理由は必須です')
    .max(2000, '残業理由は2000文字以内で入力してください'),
})

function roundHoursFromMs(diffMs: number): number {
  const hours = diffMs / (1000 * 60 * 60)
  return Math.round(hours * 100) / 100
}

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON の解析に失敗しました' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const msg = first?.message ?? '入力内容が正しくありません'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { work_date, overtime_start, overtime_end, reason } = parsed.data

  const start = new Date(overtime_start)
  const end = new Date(overtime_end)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: '日時の形式が正しくありません' }, { status: 400 })
  }
  if (end <= start) {
    return NextResponse.json(
      { error: '終了時刻は開始時刻より後である必要があります' },
      { status: 400 },
    )
  }

  const requestedHours = roundHoursFromMs(end.getTime() - start.getTime())

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  }

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, tenant_id')
    .eq('user_id', user.id)
    .single()

  if (empError || !employee) {
    return NextResponse.json(
      { error: '従業員情報が見つかりません。管理者にお問い合わせください。' },
      { status: 403 },
    )
  }

  if (!employee.tenant_id) {
    return NextResponse.json({ error: 'テナント情報が見つかりません' }, { status: 403 })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('overtime_applications')
    .insert({
      tenant_id: employee.tenant_id,
      employee_id: employee.id,
      work_date,
      overtime_start: start.toISOString(),
      overtime_end: end.toISOString(),
      requested_hours: requestedHours,
      reason: reason.trim(),
    })
    .select('id, status')
    .single()

  if (insertError) {
    console.error('overtime_applications insert:', insertError)
    return NextResponse.json({ error: '申請の登録に失敗しました' }, { status: 500 })
  }

  if (!inserted) {
    return NextResponse.json({ error: '申請の登録に失敗しました' }, { status: 500 })
  }

  return NextResponse.json(
    { id: inserted.id, status: inserted.status },
    { status: 201 },
  )
}
