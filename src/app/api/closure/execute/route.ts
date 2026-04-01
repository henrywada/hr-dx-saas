import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  fetchClosureForTenant,
  insertClosureAuditLog,
  normalizeYearMonthToFirstDay,
  requireClosureHrContext,
} from '../_context'

const bodySchema = z.object({
  year_month: z.string().min(7, '対象月を指定してください'),
})

/**
 * POST: 対象月の締めを作成（無い場合）→ 集計 → 人事承認 → ロックまで一括実行
 */
export async function POST(request: Request) {
  const ctx = await requireClosureHrContext()
  if (ctx.ok === false) return ctx.response

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

  const ymd = normalizeYearMonthToFirstDay(parsed.data.year_month)
  if (!ymd) {
    return NextResponse.json(
      { error: 'year_month は YYYY-MM または YYYY-MM-DD 形式で指定してください' },
      { status: 400 },
    )
  }

  const { supabase, tenantId, employeeId } = ctx

  const { data: existing, error: findErr } = await supabase
    .from('monthly_overtime_closures')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('year_month', ymd)
    .maybeSingle()

  if (findErr) {
    console.error('closure execute find', findErr)
    return NextResponse.json({ error: '締めの取得に失敗しました' }, { status: 500 })
  }

  let closure = existing

  if (!closure) {
    const { data: inserted, error: insErr } = await supabase
      .from('monthly_overtime_closures')
      .insert({
        tenant_id: tenantId,
        year_month: ymd,
        status: 'open',
      })
      .select('*')
      .single()

    if (insErr || !inserted) {
      console.error('closure execute insert', insErr)
      return NextResponse.json({ error: '締めレコードの作成に失敗しました' }, { status: 500 })
    }

    const { error: createAuditErr } = await insertClosureAuditLog(supabase, {
      tenantId,
      closureId: inserted.id,
      actorId: employeeId,
      action: 'closure_create',
      target: { year_month: ymd, status: 'open' },
      comment: null,
    })
    if (createAuditErr) {
      console.error('closure_audit_logs insert', createAuditErr)
    }

    closure = inserted
  }

  if (closure.status === 'locked') {
    return NextResponse.json({ error: 'この月の締めは既にロック済みです' }, { status: 400 })
  }

  let closureId = closure.id
  let status = closure.status ?? 'open'

  if (status === 'open') {
    const { error: rpcErr } = await supabase.rpc('aggregate_monthly_closure', {
      p_closure_id: closureId,
      p_tenant_id: tenantId,
    })
    if (rpcErr) {
      console.error('aggregate_monthly_closure execute', rpcErr)
      return NextResponse.json(
        { error: rpcErr.message || '集計処理に失敗しました' },
        { status: 500 },
      )
    }
  }

  const { data: afterAgg, error: reloadErr } = await fetchClosureForTenant(supabase, closureId, tenantId)
  if (reloadErr || !afterAgg) {
    console.error('closure execute reload after aggregate', reloadErr)
    return NextResponse.json({ error: '締め状態の再取得に失敗しました' }, { status: 500 })
  }

  status = afterAgg.status ?? 'open'

  if (status === 'aggregated') {
    const { data: approvedRow, error: apprErr } = await supabase
      .from('monthly_overtime_closures')
      .update({
        status: 'approved',
        approved_by: employeeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', closureId)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (apprErr || !approvedRow) {
      console.error('closure execute approve', apprErr)
      return NextResponse.json({ error: '承認の更新に失敗しました' }, { status: 500 })
    }
  }

  const { data: afterAppr, error: reload2Err } = await fetchClosureForTenant(supabase, closureId, tenantId)
  if (reload2Err || !afterAppr) {
    console.error('closure execute reload after approve', reload2Err)
    return NextResponse.json({ error: '締め状態の再取得に失敗しました' }, { status: 500 })
  }

  status = afterAppr.status ?? 'open'

  if (status === 'approved') {
    const { data: lockedRow, error: lockErr } = await supabase
      .from('monthly_overtime_closures')
      .update({
        status: 'locked',
        locked_by: employeeId,
        lock_reason: null,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', closureId)
      .eq('tenant_id', tenantId)
      .select('*')
      .single()

    if (lockErr || !lockedRow) {
      console.error('closure execute lock', lockErr)
      return NextResponse.json({ error: 'ロックの更新に失敗しました' }, { status: 500 })
    }
  }

  const { data: finalRow, error: finalErr } = await fetchClosureForTenant(supabase, closureId, tenantId)
  if (finalErr || !finalRow) {
    console.error('closure execute final', finalErr)
    return NextResponse.json({ error: '締めの最終取得に失敗しました' }, { status: 500 })
  }

  if (finalRow.status !== 'locked') {
    return NextResponse.json(
      { error: '一括締めを完了できませんでした（想定外の状態です）' },
      { status: 500 },
    )
  }

  const { error: execAuditErr } = await insertClosureAuditLog(supabase, {
    tenantId,
    closureId,
    actorId: employeeId,
    action: 'closure_execute',
    target: { year_month: ymd, final_status: 'locked' },
    comment: null,
  })
  if (execAuditErr) {
    console.error('closure_audit_logs closure_execute', execAuditErr)
  }

  return NextResponse.json({ ok: true, item: finalRow })
}
