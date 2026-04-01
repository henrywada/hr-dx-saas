import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import { format, parseISO, startOfMonth } from 'date-fns'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/** 省略時は Asia/Tokyo の当月1日 */
function getDefaultMonthStartInTokyo(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  if (!y || !m) {
    return format(startOfMonth(new Date()), 'yyyy-MM-dd')
  }
  return `${y}-${m}-01`
}

export function parseYearMonthParam(searchParams: URLSearchParams): string {
  const raw = searchParams.get('year_month')
  if (!raw || raw.trim() === '') {
    return getDefaultMonthStartInTokyo()
  }
  const normalized = raw.length === 7 ? `${raw}-01` : raw
  const d = parseISO(normalized)
  if (Number.isNaN(d.getTime())) {
    throw new Error('invalid year_month')
  }
  return format(startOfMonth(d), 'yyyy-MM-dd')
}

export type AnalysisSessionOk = {
  ok: true
  supabase: SupabaseClient<Database>
  tenantId: string
}

export async function requireAnalysisSession(): Promise<
  AnalysisSessionOk | { ok: false; response: NextResponse }
> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, response: NextResponse.json({ error: 'ログインが必要です' }, { status: 401 }) }
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !authUser) {
    return { ok: false, response: NextResponse.json({ error: 'セッションが無効です' }, { status: 401 }) }
  }

  return { ok: true, supabase, tenantId: user.tenant_id }
}

export type AnalysisContextOk = {
  ok: true
  supabase: SupabaseClient<Database>
  tenantId: string
  yearMonth: string
}

export async function requireAnalysisContext(request: Request): Promise<
  AnalysisContextOk | { ok: false; response: NextResponse }
> {
  const session = await requireAnalysisSession()
  if (session.ok === false) {
    return session
  }

  let yearMonth: string
  try {
    yearMonth = parseYearMonthParam(new URL(request.url).searchParams)
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'year_month が不正です' }, { status: 400 }) }
  }

  return { ok: true, supabase: session.supabase, tenantId: session.tenantId, yearMonth }
}
