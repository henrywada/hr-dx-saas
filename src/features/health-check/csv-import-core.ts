/**
 * 健診 CSV 取込のテナント非依存コア。
 * HR 画面（RLS クライアント）と SaaS 移行（admin client）の両方から使う。
 */
import { convertItemValue, convertOverallJudgment, indexJudgmentCodes } from './convert'
import { isEmptyCell, normalizeEmployeeNo } from './csv-parse'
import {
  inferItemKind,
  kyokaiHeaderToItemCode,
  normalizeHeader,
  slugItemCode,
} from './kyokai-preset'
import type {
  ColumnRole,
  ConvertContext,
  FileKind,
  HealthCheckItem,
  HealthCheckJudgmentCode,
  KyokaiPresetSpec,
  MergedCsvPerson,
} from './types'

type ColumnMapRow = {
  header_name: string
  file_kind: FileKind
  item_id: string | null
  column_role: ColumnRole
}

export type EmployeeByNo = {
  id: string
  name: string | null
  employee_no: string | null
  sex?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export async function ensureItemForHeader(
  supabase: AnyClient,
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

export function skipSet(spec: KyokaiPresetSpec): Set<string> {
  return new Set((spec.skip_headers ?? []).map(h => normalizeHeader(h)))
}

export function inferColumnRole(header: string, spec: KyokaiPresetSpec): ColumnRole {
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

/** テナント内の employees.employee_no を正規化キーで引ける Map にする */
export async function loadEmployeesByNo(
  supabase: AnyClient,
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

export async function applyPresetToInstitutionCore(input: {
  supabase: AnyClient
  tenantId: string
  institutionId: string
  presetCode: string
  headersByKind?: Partial<Record<FileKind, string[]>>
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, tenantId, institutionId, presetCode, headersByKind } = input
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

  return { ok: true }
}

export async function commitCsvImportCore(input: {
  supabase: AnyClient
  tenantId: string
  campaignId: string
  institutionId: string
  people: MergedCsvPerson[]
}): Promise<{ ok: boolean; error?: string; imported: number; errors: string[] }> {
  const { supabase, tenantId } = input

  const [{ data: institution }, { data: presetRow }, { data: codes }, { data: items }] =
    await Promise.all([
      supabase
        .from('health_check_institutions')
        .select('*')
        .eq('id', input.institutionId)
        .eq('tenant_id', tenantId)
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
    (presetRow ?? []).find((p: { code: string }) => p.code === institution.preset_code)?.spec ??
    (presetRow ?? []).find((p: { code: string }) => p.code === 'kyokai_3file')?.spec ??
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
      g === 'male' || g === '男' || g === '男性'
        ? 'male'
        : g === 'female' || g === '女' || g === '女性'
          ? 'female'
          : null

    const ctx: ConvertContext = {
      isStandardInstitution: isStandard,
      judgmentCodeByRaw: byRaw,
      judgmentCodeByStandardCode: byStandard,
      unitMultiplierByItemAndFrom: unitMap,
      thresholdsByItemId: (thresholds ?? []).map(
        (t: {
          item_id: string
          sex: 'male' | 'female' | null
          min_value: number | null
          max_value: number | null
          judgment_id: string | null
        }) => ({
          item_id: t.item_id,
          sex: t.sex,
          min_value: t.min_value == null ? null : Number(t.min_value),
          max_value: t.max_value == null ? null : Number(t.max_value),
          judgment_id: t.judgment_id,
        })
      ),
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

    const itemRows: Record<string, unknown>[] = []
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
      const unique = new Map<string, Record<string, unknown>>()
      for (const row of itemRows) unique.set(String(row.item_id), row)
      const { error: irErr } = await supabase
        .from('health_check_item_results')
        .insert([...unique.values()])
      if (irErr) errors.push(`${person.employeeNo}: 項目保存 ${irErr.message}`)
    }
    imported += 1
  }

  return { ok: true, imported, errors }
}
