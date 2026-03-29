/**
 * POST /api/overtime/applications/:id/approve — 残業申請を承認（上長・同一部署スコープ）
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  assertApplicantInManagerDivision,
  getApproverContext,
} from '@/app/api/overtime/_approver-auth'

const bodySchema = z.object({
  supervisor_id: z.string().uuid('supervisor_id が不正です'),
  comment: z.union([z.string().max(2000), z.null()]).optional(),
})

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON の解析に失敗しました' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '入力が正しくありません'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const supabase = await createClient()
  const ac = await getApproverContext(supabase)
  if ('error' in ac) {
    if (ac.error === 'unauthorized') {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }
    if (ac.error === 'no_employee') {
      return NextResponse.json({ error: '従業員情報が見つかりません' }, { status: 403 })
    }
    return NextResponse.json({ error: '承認権限がありません' }, { status: 403 })
  }

  if (parsed.data.supervisor_id !== ac.supervisorEmployeeId) {
    return NextResponse.json({ error: 'supervisor_id がログインユーザーと一致しません' }, { status: 403 })
  }

  const { data: row, error: fetchErr } = await supabase
    .from('overtime_applications')
    .select('id, tenant_id, status, employee_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !row) {
    return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
  }
  if (row.tenant_id !== ac.tenantId) {
    return NextResponse.json({ error: 'テナントが一致しません' }, { status: 403 })
  }

  const inDivision = await assertApplicantInManagerDivision(
    supabase,
    row.employee_id,
    ac.divisionId,
    ac.tenantId,
  )
  if (!inDivision) {
    return NextResponse.json(
      { error: '同一部署の申請のみ承認できます' },
      { status: 403 },
    )
  }

  if (row.status !== '申請中') {
    return NextResponse.json({ error: '申請中の申請のみ承認できます' }, { status: 409 })
  }

  const nowIso = new Date().toISOString()
  const raw = parsed.data.comment
  const comment = typeof raw === 'string' ? raw.trim() : ''
  const { data: updated, error: updErr } = await supabase
    .from('overtime_applications')
    .update({
      status: '承認済',
      supervisor_id: parsed.data.supervisor_id,
      approved_at: nowIso,
      supervisor_comment: comment ? comment : null,
    })
    .eq('id', id)
    .eq('tenant_id', ac.tenantId)
    .select('id, status')
    .single()

  if (updErr || !updated) {
    console.error('overtime approve:', updErr)
    return NextResponse.json({ error: '承認の更新に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ id: updated.id, status: updated.status as '承認済' })
}
