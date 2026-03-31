import { NextResponse } from 'next/server'
import { fetchClosureForTenant, requireClosureHrContext, insertClosureAuditLog } from '../../_context'

/**
 * POST: 集計済み締めを承認（status = approved）
 */
export async function POST(_request: Request, context: { params: Promise<{ closure_id: string }> }) {
  const { closure_id } = await context.params
  const ctx = await requireClosureHrContext()
  if (ctx.ok === false) return ctx.response

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
  if (prev !== 'aggregated') {
    return NextResponse.json(
      { error: '集計済み（aggregated）の締めのみ承認できます' },
      { status: 400 },
    )
  }

  const { data: updated, error: updErr } = await supabase
    .from('monthly_overtime_closures')
    .update({
      status: 'approved',
      approved_by: employeeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', closure_id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (updErr || !updated) {
    console.error('monthly_overtime_closures approve', updErr)
    return NextResponse.json({ error: '承認の更新に失敗しました' }, { status: 500 })
  }

  const { error: auditErr } = await insertClosureAuditLog(supabase, {
    tenantId,
    closureId: closure_id,
    actorId: employeeId,
    action: 'approve',
    target: { previous_status: prev, new_status: 'approved' },
    comment: null,
  })
  if (auditErr) {
    console.error('closure_audit_logs insert', auditErr)
  }

  return NextResponse.json({ ok: true, item: updated })
}
