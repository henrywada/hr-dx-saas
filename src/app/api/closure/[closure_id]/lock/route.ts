import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchClosureForTenant, requireClosureHrContext, insertClosureAuditLog } from '../../_context'

const bodySchema = z.object({
  lock_reason: z.string().max(2000).optional(),
})

/**
 * POST: 承認済み締めをロック（status = locked）
 */
export async function POST(request: Request, context: { params: Promise<{ closure_id: string }> }) {
  const { closure_id } = await context.params
  const ctx = await requireClosureHrContext()
  if (ctx.ok === false) return ctx.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    json = {}
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? '入力が不正です'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const lockReason = parsed.data.lock_reason?.trim() || null

  const { supabase, tenantId, employeeId } = ctx

  const { data: closure, error: fetchErr } = await fetchClosureForTenant(supabase, closure_id, tenantId)
  if (fetchErr) {
    console.error('fetch closure', fetchErr)
    return NextResponse.json({ error: '締めの取得に失敗しました' }, { status: 500 })
  }
  if (!closure) {
    return NextResponse.json({ error: '締めが見つかりません' }, { status: 404 })
  }

  const prev = closure.status ?? 'open'
  if (prev !== 'approved') {
    return NextResponse.json(
      { error: '承認済み（approved）の締めのみロックできます' },
      { status: 400 },
    )
  }

  const { data: updated, error: updErr } = await supabase
    .from('monthly_overtime_closures')
    .update({
      status: 'locked',
      locked_by: employeeId,
      lock_reason: lockReason,
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', closure_id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (updErr || !updated) {
    console.error('monthly_overtime_closures lock', updErr)
    return NextResponse.json({ error: 'ロックの更新に失敗しました' }, { status: 500 })
  }

  const { error: auditErr } = await insertClosureAuditLog(supabase, {
    tenantId,
    closureId: closure_id,
    actorId: employeeId,
    action: 'lock',
    target: { previous_status: prev, new_status: 'locked', lock_reason: lockReason },
    comment: lockReason,
  })
  if (auditErr) {
    console.error('closure_audit_logs insert', auditErr)
  }

  return NextResponse.json({ ok: true, item: updated })
}
