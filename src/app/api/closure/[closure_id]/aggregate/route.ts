import { NextResponse } from 'next/server'
import { fetchClosureForTenant, requireClosureHrContext, insertClosureAuditLog } from '../../_context'

/**
 * POST: 集計 RPC aggregate_monthly_closure を実行
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

  const status = closure.status ?? 'open'
  if (status === 'locked' || status === 'approved') {
    return NextResponse.json(
      { error: '承認済みまたはロック済みの締めは集計できません' },
      { status: 400 },
    )
  }

  const { error: rpcErr } = await supabase.rpc('aggregate_monthly_closure', {
    p_closure_id: closure_id,
    p_tenant_id: tenantId,
  })

  if (rpcErr) {
    console.error('aggregate_monthly_closure', rpcErr)
    return NextResponse.json(
      { error: rpcErr.message || '集計処理に失敗しました' },
      { status: 500 },
    )
  }

  const { data: updated, error: reloadErr } = await fetchClosureForTenant(supabase, closure_id, tenantId)
  if (reloadErr) {
    console.error('reload closure', reloadErr)
  }

  const { error: auditErr } = await insertClosureAuditLog(supabase, {
    tenantId,
    closureId: closure_id,
    actorId: employeeId,
    action: 'aggregate',
    target: {
      previous_status: status,
      new_status: updated?.status ?? 'aggregated',
    },
    comment: null,
  })
  if (auditErr) {
    console.error('closure_audit_logs insert', auditErr)
  }

  return NextResponse.json({ ok: true, item: updated ?? null })
}
