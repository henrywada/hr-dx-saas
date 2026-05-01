import { createClient } from '@/lib/supabase/server'
import type { DivisionEstablishmentListItem, EstablishmentAnchorDisplay } from './types'
import type { EstablishmentAnchorLink } from '@/lib/stress/resolve-establishment'
import { resolveEstablishmentAndAnchorForDivision } from '@/lib/stress/resolve-establishment'
import type { StressCheckPeriod } from '@/features/stress-check/types'

async function db() {
  return (await createClient()) as any
}

type DivMeta = { id: string; name: string | null; parent_id: string | null; layer: number | null }

function buildPathLabel(divisionId: string, divById: Map<string, DivMeta>): string {
  const parts: string[] = []
  let cur: string | null = divisionId
  const guard = new Set<string>()
  while (cur && !guard.has(cur)) {
    guard.add(cur)
    const d = divById.get(cur)
    if (!d) break
    parts.push(d.name?.trim() || '—')
    cur = d.parent_id
  }
  return parts.reverse().join(' › ')
}

/** 一覧の「代表」実施期間（実施中を優先、なければ created_at 降順で先頭） */
function pickPeriodForEstablishmentList(periods: StressCheckPeriod[]): StressCheckPeriod | null {
  if (!periods.length) return null
  const active = periods.filter((p) => p.status === 'active')
  const pool = active.length ? active : periods
  return [...pool].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0]
}

export async function listDivisionEstablishments(tenantId: string): Promise<{
  establishments: DivisionEstablishmentListItem[]
  /** アンカー部署 division_id → そのアンカー経由で拠点に属する従業員数（一覧チェックボックス表示用） */
  anchorEmployeeCounts: Record<string, number>
}> {
  const supabase = await db()
  const { data, error } = await supabase
    .from('division_establishments')
    .select(
      'id, tenant_id, name, code, workplace_address, labor_office_reporting_name, created_at, updated_at',
    )
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })

  if (error) {
    console.error('listDivisionEstablishments', error)
    throw error
  }

  const rows = data ?? []

  const [{ data: anchorRows }, { data: divs }, { data: periodRows }, { data: empRows }] =
    await Promise.all([
      supabase
        .from('division_establishment_anchors')
        .select('division_establishment_id, division_id')
        .eq('tenant_id', tenantId),
      supabase.from('divisions').select('id, name, parent_id, layer').eq('tenant_id', tenantId),
      supabase
        .from('stress_check_periods')
        .select('*')
        .eq('tenant_id', tenantId)
        .not('division_establishment_id', 'is', null),
      supabase.from('employees').select('id, division_id').eq('tenant_id', tenantId),
    ])

  const divList = (divs ?? []) as DivMeta[]
  const divById = new Map(divList.map((d) => [d.id, d]))
  const divisionParentById = new Map(
    divList.map((d) => [d.id, { id: d.id, parent_id: d.parent_id }] as const),
  )

  const anchorLinks = (anchorRows ?? []) as EstablishmentAnchorLink[]
  const anchorHitCount = new Map<string, number>()
  for (const link of anchorLinks) {
    anchorHitCount.set(link.division_id, 0)
  }
  for (const e of empRows ?? []) {
    const { anchorDivisionId } = resolveEstablishmentAndAnchorForDivision(
      e.division_id as string | null,
      tenantId,
      anchorLinks,
      divisionParentById as Map<string, { id: string; parent_id: string | null }>,
    )
    if (anchorDivisionId !== null) {
      anchorHitCount.set(
        anchorDivisionId,
        (anchorHitCount.get(anchorDivisionId) ?? 0) + 1,
      )
    }
  }
  const anchorEmployeeCounts = Object.fromEntries(anchorHitCount)

  const anchorsByEst = new Map<string, EstablishmentAnchorDisplay[]>()

  for (const a of anchorRows ?? []) {
    const estId = a.division_establishment_id as string
    const divId = a.division_id as string
    const meta = divById.get(divId)
    const display: EstablishmentAnchorDisplay = {
      division_id: divId,
      name: meta?.name ?? null,
      layer: meta?.layer ?? null,
      path_label: buildPathLabel(divId, divById),
      employee_count: anchorHitCount.get(divId) ?? 0,
    }
    if (!anchorsByEst.has(estId)) anchorsByEst.set(estId, [])
    anchorsByEst.get(estId)!.push(display)
  }

  for (const list of anchorsByEst.values()) {
    list.sort((x, y) => {
      const la = x.layer ?? 0
      const lb = y.layer ?? 0
      if (la !== lb) return la - lb
      return (x.path_label || '').localeCompare(y.path_label || '', 'ja')
    })
  }

  const periodsByEst = new Map<string, StressCheckPeriod[]>()
  for (const raw of periodRows ?? []) {
    const p = raw as StressCheckPeriod
    const estId = p.division_establishment_id
    if (!estId) continue
    if (!periodsByEst.has(estId)) periodsByEst.set(estId, [])
    periodsByEst.get(estId)!.push(p)
  }

  return {
    establishments: rows.map((row: any) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      code: row.code,
      workplace_address: row.workplace_address,
      labor_office_reporting_name: row.labor_office_reporting_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      anchors: anchorsByEst.get(row.id) ?? [],
      stress_check_period_list: pickPeriodForEstablishmentList(periodsByEst.get(row.id) ?? []),
    })),
    anchorEmployeeCounts,
  }
}

export async function listDivisionsForAnchorPicker(tenantId: string) {
  const supabase = await db()
  const { data, error } = await supabase
    .from('divisions')
    .select('id, name, parent_id, layer')
    .eq('tenant_id', tenantId)
    .order('layer', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getTenantStressSettingsRow(tenantId: string): Promise<{
  min_group_analysis_respondents: number
} | null> {
  const supabase = await db()
  const { data } = await supabase
    .from('tenant_stress_settings')
    .select('min_group_analysis_respondents')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!data) return null
  return { min_group_analysis_respondents: data.min_group_analysis_respondents }
}

export async function countEmployeesWithoutEstablishment(tenantId: string): Promise<number> {
  const supabase = await db()
  const { data: emps } = await supabase
    .from('employees')
    .select('id, division_id')
    .eq('tenant_id', tenantId)

  const { data: anchorRows } = await supabase
    .from('division_establishment_anchors')
    .select('division_establishment_id, division_id')
    .eq('tenant_id', tenantId)

  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, parent_id')
    .eq('tenant_id', tenantId)

  const anchorLinks = (anchorRows ?? []) as EstablishmentAnchorLink[]

  const { buildEmployeeEstablishmentMap } = await import('@/lib/stress/resolve-establishment')
  const map = buildEmployeeEstablishmentMap(
    emps ?? [],
    tenantId,
    anchorLinks,
    divisions ?? [],
  )
  let n = 0
  for (const e of emps ?? []) {
    if (!map.get(e.id)) n++
  }
  return n
}
