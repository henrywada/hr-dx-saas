'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { createAnnouncement } from '@/features/dashboard/actions'
import { toJSTISOString } from '@/lib/datetime'
import { convertItemValue, convertOverallJudgment, buildConvertContext } from './convert'
import {
  applyPresetToInstitutionCore,
  commitCsvImportCore,
  loadEmployeesByNo,
} from './csv-import-core'
import { isEmptyCell, normalizeEmployeeNo } from './csv-parse'
import {
  inferItemKind,
  kyokaiHeaderToItemCode,
  normalizeHeader,
  slugItemCode,
} from './kyokai-preset'
import type {
  CampaignStatus,
  EmploymentJudgment,
  FileKind,
  HealthCheckItem,
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
  revalidatePath(APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_CONVERSION)
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

function uniqueConflict(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '23505' || Boolean(error?.message?.includes('duplicate'))
}

async function requireOtherInstitution(
  supabase: any,
  tenantId: string,
  institutionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!institutionId) return { ok: false, error: '機関を選んでください' }
  const { data } = await supabase
    .from('health_check_institutions')
    .select('id, is_standard')
    .eq('id', institutionId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!data) return { ok: false, error: '機関が見つかりません' }
  if (data.is_standard) {
    return { ok: false, error: '標準機関の取込は変換しません。他機関を選んでください' }
  }
  return { ok: true }
}

export async function createJudgmentCode(input: {
  code: string
  label?: string | null
  severity_rank?: number
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const code = input.code.trim()
  if (!code) return { ok: false, error: '判定コードを入力してください' }
  const supabase = await getSupabase()
  const { error } = await supabase.from('health_check_judgment_codes').insert({
    tenant_id: user.tenant_id,
    code,
    label: (input.label ?? '').trim() || code,
    severity_rank: Number.isFinite(input.severity_rank) ? Number(input.severity_rank) : 0,
  })
  if (error) {
    if (uniqueConflict(error))
      return { ok: false, error: `判定コード ${code} はすでに登録されています` }
    return { ok: false, error: error.message }
  }
  revalidateHealthCheck()
  return { ok: true }
}

export async function deleteJudgmentCode(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('health_check_judgment_codes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function upsertJudgmentCodeMap(input: {
  institutionId: string
  rawCode: string
  standardJudgmentId: string
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const rawCode = input.rawCode.trim()
  if (!rawCode) return { ok: false, error: '機関の判定コードを入力してください' }
  if (!input.institutionId) return { ok: false, error: '機関を選んでください' }
  if (!input.standardJudgmentId) return { ok: false, error: '標準判定コードを選んでください' }

  const supabase = await getSupabase()
  const inst = await requireOtherInstitution(supabase, user.tenant_id, input.institutionId)
  if (!inst.ok) return inst

  const { error } = await supabase.from('health_check_judgment_code_maps').upsert(
    {
      tenant_id: user.tenant_id,
      institution_id: input.institutionId,
      raw_code: rawCode,
      standard_judgment_id: input.standardJudgmentId,
    },
    { onConflict: 'institution_id,raw_code' }
  )
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function deleteJudgmentCodeMap(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('health_check_judgment_code_maps')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function upsertUnitConversion(input: {
  institutionId: string
  itemId: string
  fromUnit: string
  toUnit: string
  multiplier: number
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const fromUnit = input.fromUnit.trim()
  const toUnit = input.toUnit.trim()
  if (!input.itemId) return { ok: false, error: '検査項目を選んでください' }
  if (!fromUnit || !toUnit) return { ok: false, error: '変換元・変換先の単位を入力してください' }
  if (!Number.isFinite(input.multiplier) || input.multiplier === 0) {
    return { ok: false, error: '倍率は0以外の数値を入力してください' }
  }

  const supabase = await getSupabase()
  const inst = await requireOtherInstitution(supabase, user.tenant_id, input.institutionId)
  if (!inst.ok) return inst

  const { error } = await supabase.from('health_check_unit_conversions').upsert(
    {
      tenant_id: user.tenant_id,
      institution_id: input.institutionId,
      item_id: input.itemId,
      from_unit: fromUnit,
      to_unit: toUnit,
      multiplier: input.multiplier,
    },
    { onConflict: 'institution_id,item_id,from_unit,to_unit' }
  )
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function deleteUnitConversion(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('health_check_unit_conversions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function createItemThreshold(input: {
  institutionId: string
  itemId: string
  sex?: 'male' | 'female' | null
  minValue?: number | null
  maxValue?: number | null
  judgmentId: string
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  if (!input.itemId) return { ok: false, error: '検査項目を選んでください' }
  if (!input.judgmentId) return { ok: false, error: '標準判定コードを選んでください' }
  const minValue = input.minValue ?? null
  const maxValue = input.maxValue ?? null
  if (minValue == null && maxValue == null) {
    return { ok: false, error: '下限または上限を入力してください' }
  }
  if (minValue != null && maxValue != null && minValue > maxValue) {
    return { ok: false, error: '下限は上限以下にしてください' }
  }

  const supabase = await getSupabase()
  const inst = await requireOtherInstitution(supabase, user.tenant_id, input.institutionId)
  if (!inst.ok) return inst

  const { error } = await supabase.from('health_check_item_thresholds').insert({
    tenant_id: user.tenant_id,
    institution_id: input.institutionId,
    item_id: input.itemId,
    sex: input.sex ?? null,
    min_value: minValue,
    max_value: maxValue,
    judgment_id: input.judgmentId,
  })
  if (error) return { ok: false, error: error.message }
  revalidateHealthCheck()
  return { ok: true }
}

export async function deleteItemThreshold(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !isHr(user.appRole)) return { ok: false, error: '権限がありません' }
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('health_check_item_thresholds')
    .delete()
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
  const result = await applyPresetToInstitutionCore({
    supabase,
    tenantId: user.tenant_id,
    institutionId,
    presetCode,
    headersByKind,
  })
  if (result.ok) revalidateHealthCheck()
  return result
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
  const result = await commitCsvImportCore({
    supabase,
    tenantId: user.tenant_id,
    campaignId: input.campaignId,
    institutionId: input.institutionId,
    people: input.people,
  })
  if (result.ok) revalidateHealthCheck()
  return result
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
    .select('id, employee_no, sex')
    .eq('id', input.employeeId)
    .maybeSingle()
  if (!emp?.employee_no) return { ok: false, error: '従業員番号がありません' }

  const { data: existing } = await supabase
    .from('health_check_records')
    .select('id')
    .eq('campaign_id', input.campaignId)
    .eq('employee_id', input.employeeId)
    .maybeSingle()

  const [
    { data: institution },
    { data: codes },
    { data: codeMaps },
    { data: conversions },
    { data: thresholds },
  ] = await Promise.all([
    supabase
      .from('health_check_institutions')
      .select('is_standard')
      .eq('id', input.institutionId)
      .maybeSingle(),
    supabase.from('health_check_judgment_codes').select('*').eq('tenant_id', user.tenant_id),
    supabase
      .from('health_check_judgment_code_maps')
      .select('raw_code, standard_judgment_id')
      .eq('institution_id', input.institutionId),
    supabase
      .from('health_check_unit_conversions')
      .select('*')
      .eq('institution_id', input.institutionId),
    supabase
      .from('health_check_item_thresholds')
      .select('*')
      .eq('institution_id', input.institutionId),
  ])

  const g = String(emp.sex ?? '')
  const sex: 'male' | 'female' | null =
    g === 'male' || g === '男' || g === '男性'
      ? 'male'
      : g === 'female' || g === '女' || g === '女性'
        ? 'female'
        : null

  const ctx = buildConvertContext({
    isStandardInstitution: Boolean(institution?.is_standard),
    judgmentCodes: codes ?? [],
    codeMaps: codeMaps ?? [],
    conversions: conversions ?? [],
    thresholds: thresholds ?? [],
    employeeSex: sex,
  })
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
