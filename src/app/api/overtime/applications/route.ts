import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { handleOvertimeApplicationsList } from '@/app/api/overtime/applications/list'

export async function GET(request: Request) {
  const supabase = await createClient()
  return handleOvertimeApplicationsList(request, supabase)
}

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

  const updatePayload = {
    overtime_start: start.toISOString(),
    overtime_end: end.toISOString(),
    requested_hours: requestedHours,
    reason: reason.trim(),
    status: '申請中' as const,
    supervisor_id: null as string | null,
    approved_at: null as string | null,
    supervisor_comment: null as string | null,
  }

  /** 未処理の同一日申請は 1 件にまとめる（連打・再送信で複数行にならないようにする） */
  const { data: pendingList, error: pendingErr } = await supabase
    .from('overtime_applications')
    .select('id')
    .eq('tenant_id', employee.tenant_id)
    .eq('employee_id', employee.id)
    .eq('work_date', work_date)
    .in('status', ['申請中', '修正依頼'])
    .order('created_at', { ascending: false })

  if (pendingErr) {
    console.error('overtime_applications pending select:', pendingErr)
    return NextResponse.json({ error: '申請の確認に失敗しました' }, { status: 500 })
  }

  const pending = pendingList ?? []
  if (pending.length > 0) {
    const primaryId = pending[0].id
    const duplicateIds = pending.slice(1).map((r) => r.id)

    const { data: updated, error: updErr } = await supabase
      .from('overtime_applications')
      .update(updatePayload)
      .eq('id', primaryId)
      .eq('employee_id', employee.id)
      .select('id, status')
      .single()

    if (updErr || !updated) {
      console.error('overtime_applications update:', updErr)
      return NextResponse.json({ error: '申請の更新に失敗しました' }, { status: 500 })
    }

    if (duplicateIds.length > 0) {
      const { error: delErr } = await supabase
        .from('overtime_applications')
        .delete()
        .in('id', duplicateIds)
      if (delErr) {
        console.error('overtime_applications duplicate delete:', delErr)
      }
    }

    return NextResponse.json({ id: updated.id, status: updated.status }, { status: 200 })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('overtime_applications')
    .insert({
      tenant_id: employee.tenant_id,
      employee_id: employee.id,
      work_date,
      ...updatePayload,
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
