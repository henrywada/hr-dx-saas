'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { createAnnouncement } from '@/features/dashboard/actions'
import { toJSTISOString } from '@/lib/datetime'
import { convertItemValue, convertOverallJudgment, indexJudgmentCodes } from './convert'
import { isEmptyCell, normalizeEmployeeNo } from './csv-parse'
import {
  inferItemKind,
  kyokaiHeaderToItemCode,
  normalizeHeader,
  slugItemCode,
} from './kyokai-preset'
import type {
  CampaignStatus,
  ColumnRole,
  ConvertContext,
  EmploymentJudgment,
  FileKind,
  HealthCheckItem,
  HealthCheckJudgmentCode,
  KyokaiPresetSpec,
  MergedCsvPerson,
} from './types'
import { HR_ROLES, MEDICAL_ROLES } from './types'

async function getSupabase() {
  return (await createClient()) as any
}

function isHr(role?: string | null) {
  return HR_ROLES.includes(role as (typeof HR_ROLES)[number])
}
function isMedical(role?: string | null) {
  return MEDICAL_ROLES.includes(role as (typeof MEDICAL_ROLES)[number])
}

function revalidateHealthCheck() {
  revalidatePath(APP_ROUTES.TENANT.HEALTH_CHECK)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_MANUAL)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_ANALYSIS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_SETTINGS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_REVIEW)
}

export async function createCampaign(input: {
  fiscal_year: number
  round: 1 | 2
  title: string
  start_date?: string | null
  end_date?: string | null
  status?: CampaignStatus
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_campaigns')
    .insert({
      tenant_id: user.tenant_id,
      fiscal_year: input.fiscal_year,
      round: input.round,
      title: input.title,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      status: input.status ?? 'draft',
    })
    .select('id')
    .single()
  if (error) {
    if (
      error.code === '23505' ||
      error.message?.includes('health_check_campaigns_tenant_year_round')
    ) {
      return {
        ok: false,
        error: `${input.fiscal_year}年度 第${input.round}回はすでに登録されています。回を変えるか、下の一覧から既存の実施回を選んでください。`,
      }
    }
    return { ok: false, error: error.message }
  }
  revalidateHealthCheck()
  return { ok: true, id: data.id }
}

export async function updateCampaign(
  id: string,
  input: Partial<{
    title: string
    start_date: string | null
    end_date: string | null
    status: CampaignStatus
  }>
): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('health_check_campaigns')
    .update(input)
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function deleteCampaign(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('health_check_campaigns')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function createInstitution(input: {
  name: string
  is_standard?: boolean
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_institutions')
    .insert({
      tenant_id: user.tenant_id,
      name: input.name,
      is_standard: input.is_standard ?? false,
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true, id: data.id }
}

export async function deleteInstitution(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('health_check_institutions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function setStandardInstitution(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('health_check_institutions')
    .update({ is_standard: true })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function applyPresetToInstitution(
  institutionId: string,
  presetCode: string,
  headersByKind?: Partial<Record<FileKind, string[]>>
): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const tenantId = user.tenant_id

  const { data: preset, error: pErr } = await supabase
    .from('health_check_csv_format_presets')
    .select('*')
    .eq('code', presetCode)
    .maybeSingle()
  if (pErr || !preset) return { ok: false, error: 'プリセットが見つかりません' }

  const spec = preset.spec as KyokaiPresetSpec
  const { error: instErr } = await supabase
    .from('health_check_institutions')
    .update({ preset_code: presetCode })
    .eq('id', institutionId)
    .eq('tenant_id', tenantId)
  if (instErr) return { ok: false, error: instErr.message }

  for (const jc of spec.judgment_codes ?? []) {
    await supabase.from('health_check_judgment_codes').upsert(
      {
        tenant_id: tenantId,
        code: jc.code,
        label: jc.label,
        severity_rank: jc.severity_rank,
      },
      { onConflict: 'tenant_id,code' }
    )
  }

  const kinds = (Object.keys(headersByKind ?? {}) as FileKind[]).filter(
    k => (headersByKind?.[k]?.length ?? 0) > 0
  )
  for (const kind of kinds) {
    const headers = headersByKind?.[kind] ?? []
    const { error: delErr } = await supabase
      .from('health_check_csv_column_maps')
      .delete()
      .eq('institution_id', institutionId)
      .eq('tenant_id', tenantId)
      .eq('file_kind', kind)
    if (delErr) return { ok: false, error: delErr.message }

    const rows = headers.map(header => ({
      tenant_id: tenantId,
      institution_id: institutionId,
      file_kind: kind,
      header_name: normalizeHeader(header) || header,
      item_id: null,
      column_role: inferColumnRole(header, spec),
    }))
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('health_check_csv_column_maps').insert(rows)
      if (insErr) return { ok: false, error: insErr.message }
    }
  }

  revalidateHealthCheck()
  return { ok: true }
}

export async function saveManualFormItems(input: {
  itemIds: string[]
  newItemNames: string[]
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const tenantId = user.tenant_id

  const { data: allItems, error: itemsErr } = await supabase
    .from('health_check_items')
    .select('*')
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
  if (itemsErr) return { ok: false, error: itemsErr.message }

  const items = (allItems ?? []) as HealthCheckItem[]
  const byId = new Map(items.map(i => [i.id, i]))
  const byCode = new Map(items.map(i => [i.code, i]))
  const byName = new Map(items.map(i => [normalizeHeader(i.name), i]))

  const resolved: HealthCheckItem[] = []
  const seen = new Set<string>()

  function pushItem(item: HealthCheckItem | undefined) {
    if (!item || seen.has(item.id)) return
    seen.add(item.id)
    resolved.push(item)
  }

  for (const id of input.itemIds) {
    pushItem(byId.get(id))
  }

  for (const raw of input.newItemNames) {
    const name = normalizeHeader(raw)
    if (!name) continue
    const knownCode = kyokaiHeaderToItemCode(name)
    const existing = (knownCode ? byCode.get(knownCode) : undefined) ?? byName.get(name)
    if (existing) {
      pushItem(existing)
      continue
    }
    const code = slugItemCode(name)
    const { data: created, error } = await supabase
      .from('health_check_items')
      .insert({
        tenant_id: tenantId,
        code,
        name,
        item_kind: inferItemKind(name, 'main'),
        sort_order: 900,
        is_statutory: false,
      })
      .select('*')
      .single()
    if (error) return { ok: false, error: error.message }
    pushItem(created as HealthCheckItem)
  }

  const { error: delErr } = await supabase
    .from('health_check_manual_form_items')
    .delete()
    .eq('tenant_id', tenantId)
  if (delErr) return { ok: false, error: delErr.message }

  if (resolved.length > 0) {
    const { error: insErr } = await supabase.from('health_check_manual_form_items').insert(
      resolved.map((item, i) => ({
        tenant_id: tenantId,
        item_id: item.id,
        sort_order: (i + 1) * 10,
      }))
    )
    if (insErr) return { ok: false, error: insErr.message }
  }

  revalidateHealthCheck()
  return { ok: true }
}

type ColumnMapRow = {
  header_name: string
  file_kind: FileKind
  item_id: string | null
  column_role: ColumnRole
}

async function ensureItemForHeader(
  supabase: any,
  tenantId: string,
  header: string,
  fileKind: FileKind,
  itemCache: Map<string, HealthCheckItem>
): Promise<HealthCheckItem | null> {
  const code = kyokaiHeaderToItemCode(header) ?? slugItemCode(header)
  const cached = itemCache.get(code)
  if (cached) return cached

  const { data: existing } = await supabase
    .from('health_check_items')
    .select('*')
    .eq('code', code)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .limit(1)
    .maybeSingle()
  if (existing) {
    itemCache.set(code, existing)
    return existing
  }

  const kind = inferItemKind(header, fileKind)
  const { data: created, error } = await supabase
    .from('health_check_items')
    .insert({
      tenant_id: tenantId,
      code,
      name: normalizeHeader(header).replace(/判定$/, '') || header,
      item_kind: kind,
      sort_order: 900,
    })
    .select('*')
    .single()
  if (error) {
    console.error('ensureItemForHeader', error)
    return null
  }
  itemCache.set(code, created)
  return created
}

function skipSet(spec: KyokaiPresetSpec): Set<string> {
  return new Set((spec.skip_headers ?? []).map(h => normalizeHeader(h)))
}

function inferColumnRole(header: string, spec: KyokaiPresetSpec): ColumnRole {
  const n = normalizeHeader(header)
  if (n === normalizeHeader(spec.overall_judgment_header)) return 'overall_judgment'
  if (n === normalizeHeader(spec.primary_secondary_header)) return 'primary_secondary'
  if (
    n === normalizeHeader(spec.employee_no_header) ||
    n === normalizeHeader(spec.name_header) ||
    n === normalizeHeader(spec.exam_date_header)
  ) {
    return 'identity'
  }
  if (skipSet(spec).has(n)) return 'skip'
  if (n.endsWith(spec.auto_pair_judgment_suffix) && n !== 'メタボ判定' && !n.includes('分類判定')) {
    return 'judgment'
  }
  return 'value'
}

type EmployeeByNo = {
  id: string
  name: string | null
  employee_no: string | null
  sex?: string | null
}

/** テナント内の employees.employee_no を正規化キーで引ける Map にする */
async function loadEmployeesByNo(
  supabase: any,
  tenantId: string
): Promise<Map<string, EmployeeByNo>> {
  const { data } = await supabase
    .from('employees')
    .select('id, name, employee_no, sex')
    .eq('tenant_id', tenantId)

  const map = new Map<string, EmployeeByNo>()
  for (const e of data ?? []) {
    const key = normalizeEmployeeNo(e.employee_no)
    if (key) map.set(key, e)
  }
  return map
}

export async function previewCsvImport(input: {
  campaignId: string
  institutionId: string
  people: MergedCsvPerson[]
}): Promise<{
  ok: boolean
  error?: string
  rows: {
    employeeNo: string
    examDateYmd: string
    csvName: string
    employeeId: string | null
    employeeName: string | null
    nameMismatch: boolean
    error: string | null
    warning: string | null
    itemCount: number
  }[]
}> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) {
    return { ok: false, error: '権限がありません', rows: [] }
  }
  const supabase = await getSupabase()
  // CSV「個人コード」→ employees.employee_no（氏名では紐付けない）
  const byNo = await loadEmployeesByNo(supabase, user.tenant_id)
  const rows = input.people.map(p => {
    const emp = byNo.get(normalizeEmployeeNo(p.employeeNo))
    const dateOk = Boolean(p.examDateYmd)
    const nameMismatch = Boolean(emp && p.name && emp.name && emp.name !== p.name)
    return {
      employeeNo: p.employeeNo,
      examDateYmd: p.examDateYmd,
      csvName: p.name,
      employeeId: emp?.id ?? null,
      employeeName: emp?.name ?? null,
      nameMismatch,
      error: !dateOk
        ? '健診日が不正です'
        : emp
          ? null
          : `個人コード ${p.employeeNo} が社員番号（employee_no）に一致しません`,
      warning: nameMismatch
        ? `氏名不一致: CSV=${p.name} / マスタ=${emp?.name}`
        : (p.warnings[0] ?? null),
      itemCount: Object.values(p.files).reduce(
        (n, cells) => n + Object.keys(cells ?? {}).length,
        0
      ),
    }
  })
  return { ok: true, rows }
}

export async function commitCsvImport(input: {
  campaignId: string
  institutionId: string
  people: MergedCsvPerson[]
}): Promise<{ ok: boolean; error?: string; imported: number; errors: string[] }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) {
    return { ok: false, error: '権限がありません', imported: 0, errors: [] }
  }
  const supabase = await getSupabase()
  const tenantId = user.tenant_id

  const [{ data: institution }, { data: presetRow }, { data: codes }, { data: items }] =
    await Promise.all([
      supabase
        .from('health_check_institutions')
        .select('*')
        .eq('id', input.institutionId)
        .maybeSingle(),
      supabase.from('health_check_csv_format_presets').select('*'),
      supabase.from('health_check_judgment_codes').select('*').eq('tenant_id', tenantId),
      supabase
        .from('health_check_items')
        .select('*')
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`),
    ])
  if (!institution) return { ok: false, error: '機関が見つかりません', imported: 0, errors: [] }

  const spec: KyokaiPresetSpec | null =
    (presetRow ?? []).find((p: any) => p.code === institution.preset_code)?.spec ??
    (presetRow ?? []).find((p: any) => p.code === 'kyokai_3file')?.spec ??
    null
  if (!spec) return { ok: false, error: 'CSVプリセットがありません', imported: 0, errors: [] }

  const { data: maps } = await supabase
    .from('health_check_csv_column_maps')
    .select('*')
    .eq('institution_id', input.institutionId)
  const { data: codeMaps } = await supabase
    .from('health_check_judgment_code_maps')
    .select('*')
    .eq('institution_id', input.institutionId)
  const { data: conversions } = await supabase
    .from('health_check_unit_conversions')
    .select('*')
    .eq('tenant_id', tenantId)
  const { data: thresholds } = await supabase
    .from('health_check_item_thresholds')
    .select('*')
    .eq('tenant_id', tenantId)

  const judgmentCodes = (codes ?? []) as HealthCheckJudgmentCode[]
  const byStandard = indexJudgmentCodes(judgmentCodes)
  const byRaw = new Map<string, HealthCheckJudgmentCode>()
  for (const m of codeMaps ?? []) {
    const std = judgmentCodes.find(c => c.id === m.standard_judgment_id)
    if (std) byRaw.set(m.raw_code, std)
  }
  const unitMap = new Map<string, { toUnit: string; multiplier: number }>()
  for (const c of conversions ?? []) {
    unitMap.set(`${c.item_id}::${c.from_unit}`, {
      toUnit: c.to_unit,
      multiplier: Number(c.multiplier),
    })
  }

  const itemCache = new Map<string, HealthCheckItem>()
  for (const it of items ?? []) itemCache.set(it.code, it)

  const skips = skipSet(spec)
  const mapByHeader = new Map<string, ColumnMapRow>()
  for (const m of maps ?? []) {
    mapByHeader.set(`${m.file_kind}::${normalizeHeader(m.header_name)}`, m)
  }

  const empByNo = await loadEmployeesByNo(supabase, tenantId)

  const errors: string[] = []
  let imported = 0
  const isStandard = Boolean(institution.is_standard)

  for (const person of input.people) {
    const emp = empByNo.get(normalizeEmployeeNo(person.employeeNo))
    if (!emp) {
      errors.push(`${person.employeeNo}: 社員番号（employee_no）に一致する従業員がいません`)
      continue
    }
    if (!person.examDateYmd) {
      errors.push(`${person.employeeNo}: 健診日が不正です`)
      continue
    }

    const g = String(emp.sex ?? '')
    const sex: 'male' | 'female' | null =
      g === 'male' || g === '男' ? 'male' : g === 'female' || g === '女' ? 'female' : null

    const ctx: ConvertContext = {
      isStandardInstitution: isStandard,
      judgmentCodeByRaw: byRaw,
      judgmentCodeByStandardCode: byStandard,
      unitMultiplierByItemAndFrom: unitMap,
      thresholdsByItemId: (thresholds ?? []).map((t: any) => ({
        item_id: t.item_id,
        sex: t.sex,
        min_value: t.min_value == null ? null : Number(t.min_value),
        max_value: t.max_value == null ? null : Number(t.max_value),
        judgment_id: t.judgment_id,
      })),
      employeeSex: sex,
    }

    if (isStandard && person.overallJudgmentRaw && !byStandard.get(person.overallJudgmentRaw)) {
      await supabase.from('health_check_judgment_codes').upsert(
        {
          tenant_id: tenantId,
          code: person.overallJudgmentRaw,
          label: person.overallJudgmentRaw,
          severity_rank: 99,
        },
        { onConflict: 'tenant_id,code' }
      )
      const { data: fresh } = await supabase
        .from('health_check_judgment_codes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('code', person.overallJudgmentRaw)
        .maybeSingle()
      if (fresh) byStandard.set(fresh.code, fresh)
    }

    const overall = convertOverallJudgment(person.overallJudgmentRaw, ctx)
    if (overall.error) errors.push(`${person.employeeNo}: ${overall.error}`)

    const { data: existing } = await supabase
      .from('health_check_records')
      .select('id')
      .eq('campaign_id', input.campaignId)
      .eq('employee_id', emp.id)
      .maybeSingle()

    let recordId: string
    if (existing) {
      const { error: uErr } = await supabase
        .from('health_check_records')
        .update({
          institution_id: input.institutionId,
          exam_date: person.examDateYmd,
          primary_secondary: person.primarySecondary,
          institution_overall_judgment_raw: person.overallJudgmentRaw,
          standard_overall_judgment_id: overall.id,
          input_source: 'csv',
        })
        .eq('id', existing.id)
      if (uErr) {
        errors.push(`${person.employeeNo}: ${uErr.message}`)
        continue
      }
      recordId = existing.id
      await supabase.from('health_check_item_results').delete().eq('record_id', recordId)
    } else {
      const { data: inserted, error: iErr } = await supabase
        .from('health_check_records')
        .insert({
          tenant_id: tenantId,
          campaign_id: input.campaignId,
          employee_id: emp.id,
          institution_id: input.institutionId,
          exam_date: person.examDateYmd,
          primary_secondary: person.primarySecondary,
          institution_overall_judgment_raw: person.overallJudgmentRaw,
          standard_overall_judgment_id: overall.id,
          input_source: 'csv',
          status: 'received',
          employment_judgment: 'pending',
        })
        .select('id')
        .single()
      if (iErr || !inserted) {
        errors.push(`${person.employeeNo}: ${iErr?.message ?? '登録失敗'}`)
        continue
      }
      recordId = inserted.id
    }

    const itemRows: any[] = []
    const kinds: FileKind[] = ['main', 'additional', 'questionnaire']
    for (const kind of kinds) {
      const cells = person.files[kind]
      if (!cells) continue
      const headers = Object.keys(cells)
      for (const header of headers) {
        const n = normalizeHeader(header)
        if (skips.has(n)) continue
        const value = cells[header]
        if (isEmptyCell(value)) continue

        const mapped = mapByHeader.get(`${kind}::${n}`)
        if (mapped?.column_role === 'skip') continue
        if (
          n.endsWith(spec.auto_pair_judgment_suffix) &&
          n !== 'メタボ判定' &&
          !n.includes('分類判定')
        ) {
          continue
        }

        const item =
          mapped?.item_id != null
            ? ([...itemCache.values()].find(i => i.id === mapped.item_id) ??
              (await ensureItemForHeader(supabase, tenantId, header, kind, itemCache)))
            : await ensureItemForHeader(supabase, tenantId, header, kind, itemCache)
        if (!item) continue

        const judgmentHeader = headers.find(
          h => normalizeHeader(h) === `${n}${spec.auto_pair_judgment_suffix}`
        )
        const judgmentRaw = judgmentHeader ? cells[judgmentHeader] : null
        const converted = convertItemValue({
          itemId: item.id,
          rawValue:
            kind === 'questionnaire' && value === spec.questionnaire_yes_token ? 'はい' : value,
          rawUnit: item.standard_unit,
          institutionJudgmentRaw: judgmentRaw || null,
          ctx,
        })
        if (converted.error) errors.push(`${person.employeeNo} ${header}: ${converted.error}`)

        itemRows.push({
          tenant_id: tenantId,
          record_id: recordId,
          item_id: item.id,
          raw_value: converted.rawValue,
          raw_unit: converted.rawUnit,
          institution_judgment_raw: converted.institutionJudgmentRaw,
          standard_value: converted.standardValue,
          standard_unit: converted.standardUnit,
          standard_judgment_id: converted.standardJudgmentId,
        })
      }
    }

    if (itemRows.length > 0) {
      const unique = new Map<string, any>()
      for (const row of itemRows) unique.set(row.item_id, row)
      const { error: irErr } = await supabase
        .from('health_check_item_results')
        .insert([...unique.values()])
      if (irErr) errors.push(`${person.employeeNo}: 項目保存 ${irErr.message}`)
    }
    imported += 1
  }

  revalidateHealthCheck()
  return { ok: true, imported, errors }
}

export async function saveManualResult(input: {
  campaignId: string
  employeeId: string
  institutionId: string
  examDate: string
  overallJudgmentRaw?: string | null
  items: { itemId: string; rawValue: string; judgmentRaw?: string | null }[]
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { data: emp } = await supabase
    .from('employees')
    .select('id, employee_no')
    .eq('id', input.employeeId)
    .maybeSingle()
  if (!emp?.employee_no) return { ok: false, error: '従業員番号がありません' }

  const { data: existing } = await supabase
    .from('health_check_records')
    .select('id')
    .eq('campaign_id', input.campaignId)
    .eq('employee_id', input.employeeId)
    .maybeSingle()

  const { data: institution } = await supabase
    .from('health_check_institutions')
    .select('is_standard')
    .eq('id', input.institutionId)
    .maybeSingle()
  const { data: codes } = await supabase
    .from('health_check_judgment_codes')
    .select('*')
    .eq('tenant_id', user.tenant_id)
  const ctx: ConvertContext = {
    isStandardInstitution: Boolean(institution?.is_standard),
    judgmentCodeByRaw: new Map(),
    judgmentCodeByStandardCode: indexJudgmentCodes(codes ?? []),
    unitMultiplierByItemAndFrom: new Map(),
    thresholdsByItemId: [],
    employeeSex: null,
  }
  const overall = convertOverallJudgment(input.overallJudgmentRaw ?? null, ctx)

  let recordId: string
  if (existing) {
    const { error } = await supabase
      .from('health_check_records')
      .update({
        institution_id: input.institutionId,
        exam_date: input.examDate,
        institution_overall_judgment_raw: input.overallJudgmentRaw ?? null,
        standard_overall_judgment_id: overall.id,
        input_source: 'manual',
      })
      .eq('id', existing.id)
    if (error) return { ok: false, error: error.message }
    recordId = existing.id
    await supabase.from('health_check_item_results').delete().eq('record_id', recordId)
  } else {
    const { data: inserted, error } = await supabase
      .from('health_check_records')
      .insert({
        tenant_id: user.tenant_id,
        campaign_id: input.campaignId,
        employee_id: input.employeeId,
        institution_id: input.institutionId,
        exam_date: input.examDate,
        institution_overall_judgment_raw: input.overallJudgmentRaw ?? null,
        standard_overall_judgment_id: overall.id,
        input_source: 'manual',
        status: 'received',
        employment_judgment: 'pending',
      })
      .select('id')
      .single()
    if (error || !inserted) return { ok: false, error: error?.message ?? '登録失敗' }
    recordId = inserted.id
  }

  const rows = input.items
    .filter(i => !isEmptyCell(i.rawValue))
    .map(i => {
      const c = convertItemValue({
        itemId: i.itemId,
        rawValue: i.rawValue,
        rawUnit: null,
        institutionJudgmentRaw: i.judgmentRaw ?? null,
        ctx,
      })
      return {
        tenant_id: user.tenant_id,
        record_id: recordId,
        item_id: i.itemId,
        raw_value: c.rawValue,
        raw_unit: c.rawUnit,
        institution_judgment_raw: c.institutionJudgmentRaw,
        standard_value: c.standardValue,
        standard_unit: c.standardUnit,
        standard_judgment_id: c.standardJudgmentId,
      }
    })
  if (rows.length) {
    const { error } = await supabase.from('health_check_item_results').insert(rows)
    if (error) return { ok: false, error: error.message }
  }

  revalidateHealthCheck()
  return { ok: true }
}

export async function saveEmploymentJudgment(input: {
  recordId: string
  employmentJudgment: EmploymentJudgment
  nurseInterviewRecommended: boolean
  doctorInterviewRecommended: boolean
  doctorComment?: string | null
  doctorJudgmentCode?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || user.appRole !== 'company_doctor') {
    return { ok: false, error: '産業医のみ就業判定を保存できます' }
  }
  const supabase = await getSupabase()
  const { data: current, error: cErr } = await supabase
    .from('health_check_records')
    .select('*')
    .eq('id', input.recordId)
    .maybeSingle()
  if (cErr || !current) return { ok: false, error: '対象の結果がありません' }

  const nurseTurnOn = !current.nurse_interview_recommended && input.nurseInterviewRecommended
  const doctorTurnOn = !current.doctor_interview_recommended && input.doctorInterviewRecommended
  const now = toJSTISOString()

  const { error } = await supabase
    .from('health_check_records')
    .update({
      employment_judgment: input.employmentJudgment,
      employment_judged_at: now,
      employment_judged_by: user.employee_id,
      nurse_interview_recommended: input.nurseInterviewRecommended,
      doctor_interview_recommended: input.doctorInterviewRecommended,
      nurse_interview_recommended_at: nurseTurnOn ? now : current.nurse_interview_recommended_at,
      doctor_interview_recommended_at: doctorTurnOn ? now : current.doctor_interview_recommended_at,
    })
    .eq('id', input.recordId)
  if (error) return { ok: false, error: error.message }

  const { data: note } = await supabase
    .from('health_check_medical_notes')
    .select('id')
    .eq('record_id', input.recordId)
    .maybeSingle()
  if (note) {
    await supabase
      .from('health_check_medical_notes')
      .update({
        doctor_comment: input.doctorComment ?? null,
        doctor_judgment_code: input.doctorJudgmentCode ?? null,
      })
      .eq('id', note.id)
  } else {
    await supabase.from('health_check_medical_notes').insert({
      tenant_id: user.tenant_id,
      record_id: input.recordId,
      doctor_comment: input.doctorComment ?? null,
      doctor_judgment_code: input.doctorJudgmentCode ?? null,
    })
  }

  if (nurseTurnOn) {
    await createAnnouncement({
      title: '保健師との面談が推奨されています',
      body: '定期健康診断の結果を踏まえ、保健師との面談が推奨されています。結果画面から予約できます。',
      recipient_employee_id: current.employee_id,
      target_audience: '個別',
    })
  }
  if (doctorTurnOn) {
    await createAnnouncement({
      title: '産業医との面談が推奨されています',
      body: '定期健康診断の結果を踏まえ、産業医との面談が推奨されています。結果画面から予約できます。',
      recipient_employee_id: current.employee_id,
      target_audience: '個別',
    })
  }

  revalidateHealthCheck()
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { ok: true }
}

/** 未判定のうち、標準総合判定が一致する受診結果へ産業医判定を一括設定する */
export async function bulkApplyStandardToDoctorJudgment(input: {
  campaignId: string
  standardCode: string
  doctorJudgmentCode: string
  employmentJudgment: EmploymentJudgment
}): Promise<{
  ok: boolean
  updated?: number
  error?: string
}> {
  const user = await getServerUser()
  if (!user?.tenant_id || user.appRole !== 'company_doctor') {
    return { ok: false, error: '産業医のみ一括判定できます' }
  }
  const campaignId = input.campaignId
  const standardCode = input.standardCode.trim()
  const doctorJudgmentCode = input.doctorJudgmentCode.trim()
  const allowed: EmploymentJudgment[] = ['hold', 'fit', 'restricted', 'leave']
  if (!campaignId) return { ok: false, error: '実施回がありません' }
  if (!standardCode) return { ok: false, error: '標準総合判定を入力してください' }
  if (!doctorJudgmentCode) return { ok: false, error: '産業医判定を入力してください' }
  if (!input.employmentJudgment || !allowed.includes(input.employmentJudgment)) {
    return { ok: false, error: '就業判定を選択してください' }
  }

  const supabase = await getSupabase()
  const now = toJSTISOString()
  const { data, error } = await supabase
    .from('health_check_records')
    .select(
      `
      id,
      judgment:standard_overall_judgment_id ( code ),
      notes:health_check_medical_notes ( id, doctor_judgment_code )
    `
    )
    .eq('tenant_id', user.tenant_id)
    .eq('campaign_id', campaignId)
  if (error) return { ok: false, error: error.message }

  let updated = 0
  for (const r of data ?? []) {
    const notes = Array.isArray(r.notes) ? r.notes[0] : r.notes
    if (notes?.doctor_judgment_code) continue
    const code = String(r.judgment?.code ?? '').trim()
    if (code !== standardCode) continue
    const { error: recErr } = await supabase
      .from('health_check_records')
      .update({
        employment_judgment: input.employmentJudgment,
        employment_judged_at: now,
        employment_judged_by: user.employee_id,
      })
      .eq('id', r.id)
    if (recErr) return { ok: false, error: recErr.message }
    if (notes?.id) {
      const { error: uErr } = await supabase
        .from('health_check_medical_notes')
        .update({ doctor_judgment_code: doctorJudgmentCode })
        .eq('id', notes.id)
      if (uErr) return { ok: false, error: uErr.message }
    } else {
      const { error: iErr } = await supabase.from('health_check_medical_notes').insert({
        tenant_id: user.tenant_id,
        record_id: r.id,
        doctor_judgment_code: doctorJudgmentCode,
      })
      if (iErr) return { ok: false, error: iErr.message }
    }
    updated += 1
  }

  revalidateHealthCheck()
  return { ok: true, updated }
}

export async function saveNurseComment(input: {
  recordId: string
  nurseComment: string
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isMedical(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { data: note } = await supabase
    .from('health_check_medical_notes')
    .select('id')
    .eq('record_id', input.recordId)
    .maybeSingle()
  if (note) {
    const { error } = await supabase
      .from('health_check_medical_notes')
      .update({ nurse_comment: input.nurseComment })
      .eq('id', note.id)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from('health_check_medical_notes').insert({
      tenant_id: user.tenant_id,
      record_id: input.recordId,
      nurse_comment: input.nurseComment,
    })
    if (error) return { ok: false, error: error.message }
  }
  revalidateHealthCheck()
  return { ok: true }
}

export async function excludeEmployeeFromCampaign(
  campaignId: string,
  employeeId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase.from('program_targets').upsert(
    {
      tenant_id: user.tenant_id,
      program_type: 'health_check',
      program_instance_id: campaignId,
      employee_id: employeeId,
      is_eligible: false,
      exclusion_reason: reason ?? null,
    },
    { onConflict: 'program_type,program_instance_id,employee_id' }
  )
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}
