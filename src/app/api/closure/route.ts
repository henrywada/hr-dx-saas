import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchMonthlyClosureListWithCounts } from '@/lib/overtime/closure-list'
import {
  insertClosureAuditLog,
  normalizeYearMonthToFirstDay,
  requireClosureHrContext,
} from './_context'

/**
 * GET: 当テナントの月次締め一覧（各行に申請件数・承認件数を付与）
 * POST: 新規締め（対象月）のレコード作成
 */
export async function GET() {
  const ctx = await requireClosureHrContext()
  if (ctx.ok === false) return ctx.response

  const { supabase, tenantId } = ctx

  const result = await fetchMonthlyClosureListWithCounts(supabase, tenantId)
  if (result.ok === false) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ items: result.items })
}

const postSchema = z.object({
  year_month: z.string().min(7, '対象月を指定してください'),
})

export async function POST(request: Request) {
  const ctx = await requireClosureHrContext()
  if (ctx.ok === false) return ctx.response

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON の解析に失敗しました' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(json)
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

  const { data: existing, error: exErr } = await supabase
    .from('monthly_overtime_closures')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('year_month', ymd)
    .maybeSingle()

  if (exErr) {
    console.error('closure duplicate check', exErr)
    return NextResponse.json({ error: '重複確認に失敗しました' }, { status: 500 })
  }
  if (existing) {
    return NextResponse.json({ error: 'この月の締めは既に存在します' }, { status: 409 })
  }

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
    console.error('monthly_overtime_closures insert', insErr)
    return NextResponse.json({ error: '締めレコードの作成に失敗しました' }, { status: 500 })
  }

  const { error: auditErr } = await insertClosureAuditLog(supabase, {
    tenantId,
    closureId: inserted.id,
    actorId: employeeId,
    action: 'closure_create',
    target: { year_month: ymd, status: 'open' },
    comment: null,
  })
  if (auditErr) {
    console.error('closure_audit_logs insert', auditErr)
  }

  return NextResponse.json({ item: inserted }, { status: 201 })
}
