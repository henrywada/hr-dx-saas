import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  CsvFormatPreset,
  EmployeeResultView,
  InstitutionCsvColumnMap,
  HealthCheckCampaign,
  HealthCheckInstitution,
  HealthCheckItem,
  HealthCheckJudgmentCode,
  HealthCheckMedicalNote,
  HealthCheckRecord,
  HrRecordRow,
  OrgAnalysisRow,
  OrgLayer,
  ParticipationStats,
  HealthCheckSummaryForInterview,
} from './types'

async function getSupabase() {
  return (await createClient()) as any
}

function roleOf(appRole: { app_role: string } | { app_role: string }[] | null): string | null {
  if (!appRole) return null
  return Array.isArray(appRole) ? (appRole[0]?.app_role ?? null) : appRole.app_role
}

export async function getCampaigns(): Promise<HealthCheckCampaign[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_campaigns')
    .select('*')
    .order('fiscal_year', { ascending: false })
    .order('round', { ascending: false })
  if (error) {
    console.error('getCampaigns', error)
    return []
  }
  return data ?? []
}

/** テナントに存在する最大組織階層。層3が無い場合はドロップから除く */
export async function getMaxDivisionLayer(): Promise<number> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('divisions')
    .select('layer')
    .order('layer', { ascending: false })
    .limit(1)
  if (error) {
    console.error('getMaxDivisionLayer', error)
    return 1
  }
  return Number(data?.[0]?.layer ?? 1)
}

export async function getCampaign(id: string): Promise<HealthCheckCampaign | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_campaigns')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) {
    console.error('getCampaign', error)
    return null
  }
  return data
}

export async function getInstitutions(): Promise<HealthCheckInstitution[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_institutions')
    .select('*')
    .order('is_standard', { ascending: false })
    .order('name')
  if (error) {
    console.error('getInstitutions', error)
    return []
  }
  return data ?? []
}

export async function getInstitutionColumnMaps(): Promise<InstitutionCsvColumnMap[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_csv_column_maps')
    .select('institution_id, file_kind, header_name, column_role')
    .order('file_kind')
    .order('header_name')
  if (error) {
    console.error('getInstitutionColumnMaps', error)
    return []
  }
  return (data ?? []) as InstitutionCsvColumnMap[]
}

export async function getCsvPresets(): Promise<CsvFormatPreset[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_csv_format_presets')
    .select('*')
    .order('code')
  if (error) {
    console.error('getCsvPresets', error)
    return []
  }
  return data ?? []
}

export async function getJudgmentCodes(): Promise<HealthCheckJudgmentCode[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_judgment_codes')
    .select('*')
    .order('severity_rank')
    .order('code')
  if (error) {
    console.error('getJudgmentCodes', error)
    return []
  }
  return data ?? []
}

export async function getItems(): Promise<HealthCheckItem[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.from('health_check_items').select('*').order('sort_order')
  if (error) {
    console.error('getItems', error)
    return []
  }
  return data ?? []
}

/** 手入力フォームに出す項目 ID（未設定は空配列。画面側で既定12項目を使う） */
export async function getManualFormItemIds(): Promise<string[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_manual_form_items')
    .select('item_id, sort_order')
    .eq('tenant_id', user.tenant_id)
    .order('sort_order')
  if (error) {
    console.error('getManualFormItemIds', error)
    return []
  }
  return (data ?? []).map((r: { item_id: string }) => r.item_id)
}

/** 在籍者（産業医除外）から明示除外を除いた対象者 ID */
export async function resolveHealthCheckTargetEmployeeIds(
  campaignId: string
): Promise<Set<string>> {
  const user = await getServerUser()
  if (!user?.tenant_id) return new Set()
  const supabase = await getSupabase()

  const [{ data: rawEmployees }, { data: targets }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, active_status, app_role:app_role_id (app_role)')
      .eq('tenant_id', user.tenant_id),
    supabase
      .from('program_targets')
      .select('employee_id, is_eligible')
      .eq('tenant_id', user.tenant_id)
      .eq('program_type', 'health_check')
      .eq('program_instance_id', campaignId),
  ])

  const excluded = new Set(
    (targets ?? [])
      .filter((t: { is_eligible: boolean }) => t.is_eligible === false)
      .map((t: { employee_id: string }) => t.employee_id)
  )

  const ids = new Set<string>()
  for (const e of rawEmployees ?? []) {
    if (excluded.has(e.id)) continue
    if (e.active_status === 'inactive') continue
    const role = roleOf(e.app_role)
    if (role === 'company_doctor') continue
    ids.add(e.id)
  }
  return ids
}

export async function getParticipationStats(campaignId: string): Promise<ParticipationStats> {
  const user = await getServerUser()
  const empty: ParticipationStats = {
    targetCount: 0,
    receivedCount: 0,
    notReceivedCount: 0,
    rate: 0,
    pendingJudgmentCount: 0,
    restrictedCount: 0,
    leaveCount: 0,
    nurseRecommendedCount: 0,
    doctorRecommendedCount: 0,
  }
  if (!user?.tenant_id) return empty

  const supabase = await getSupabase()
  const targetIds = await resolveHealthCheckTargetEmployeeIds(campaignId)
  const { data: records, error } = await supabase
    .from('health_check_records')
    .select(
      'employee_id, employment_judgment, nurse_interview_recommended, doctor_interview_recommended'
    )
    .eq('campaign_id', campaignId)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('getParticipationStats', error)
    return empty
  }

  const recs = records ?? []
  const received = recs.filter((r: { employee_id: string }) => targetIds.has(r.employee_id))
  const targetCount = targetIds.size
  const receivedCount = received.length
  const rate = targetCount === 0 ? 0 : Math.round((receivedCount / targetCount) * 1000) / 10

  return {
    targetCount,
    receivedCount,
    notReceivedCount: Math.max(0, targetCount - receivedCount),
    rate,
    pendingJudgmentCount: recs.filter((r: any) => r.employment_judgment === 'pending').length,
    restrictedCount: recs.filter((r: any) => r.employment_judgment === 'restricted').length,
    leaveCount: recs.filter((r: any) => r.employment_judgment === 'leave').length,
    nurseRecommendedCount: recs.filter((r: any) => r.nurse_interview_recommended).length,
    doctorRecommendedCount: recs.filter((r: any) => r.doctor_interview_recommended).length,
  }
}

export async function getHrRecordRows(campaignId: string): Promise<HrRecordRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await getSupabase()

  const { data, error } = await supabase
    .from('health_check_records')
    .select(
      `
      id, employee_id, exam_date, status, employment_judgment,
      nurse_interview_recommended, doctor_interview_recommended, institution_id,
      employees:employee_id ( name, employee_no, divisions:division_id ( name ) ),
      institutions:institution_id ( name )
    `
    )
    .eq('campaign_id', campaignId)
    .eq('tenant_id', user.tenant_id)
    .order('exam_date', { ascending: false })

  if (error) {
    console.error('getHrRecordRows', error)
    return []
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    employee_id: r.employee_id,
    employee_name: r.employees?.name ?? '',
    employee_no: r.employees?.employee_no ?? null,
    division_name: r.employees?.divisions?.name ?? null,
    exam_date: r.exam_date,
    status: r.status,
    employment_judgment: r.employment_judgment,
    nurse_interview_recommended: r.nurse_interview_recommended,
    doctor_interview_recommended: r.doctor_interview_recommended,
    institution_name: r.institutions?.name ?? null,
  }))
}

export async function getNotReceivedEmployees(
  campaignId: string
): Promise<
  { id: string; name: string; employee_no: string | null; division_name: string | null }[]
> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await getSupabase()
  const targetIds = await resolveHealthCheckTargetEmployeeIds(campaignId)
  const { data: records } = await supabase
    .from('health_check_records')
    .select('employee_id')
    .eq('campaign_id', campaignId)
  const received = new Set((records ?? []).map((r: { employee_id: string }) => r.employee_id))
  const missing = [...targetIds].filter(id => !received.has(id))
  if (missing.length === 0) return []

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, employee_no, divisions:division_id ( name )')
    .in('id', missing)

  return (employees ?? []).map((e: any) => ({
    id: e.id,
    name: e.name,
    employee_no: e.employee_no,
    division_name: e.divisions?.name ?? null,
  }))
}

export async function getOrgAnalysis(
  campaignId: string,
  layer: OrgLayer
): Promise<OrgAnalysisRow[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('health_check_org_analysis', {
    p_campaign_id: campaignId,
    p_layer: layer,
  })
  if (error) {
    console.error('getOrgAnalysis', error)
    return []
  }
  return (data ?? []).map((r: any) => ({
    division_id: r.division_id,
    division_name: r.division_name,
    received_count: Number(r.received_count ?? 0),
    suppressed: Boolean(r.suppressed),
    judgment_code: r.judgment_code,
    judgment_label: r.judgment_label,
    judgment_count: r.judgment_count == null ? null : Number(r.judgment_count),
    severity_rank: r.severity_rank == null ? null : Number(r.severity_rank),
  }))
}

export async function getMyHealthCheckRecords(): Promise<HealthCheckRecord[]> {
  const user = await getServerUser()
  if (!user?.employee_id) return []
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_records')
    .select('*')
    .eq('employee_id', user.employee_id)
    .order('exam_date', { ascending: false })
  if (error) {
    console.error('getMyHealthCheckRecords', error)
    return []
  }
  return data ?? []
}

export async function getEmployeeResultView(
  recordId: string,
  employeeId?: string
): Promise<EmployeeResultView | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null
  const supabase = await getSupabase()

  const { data: record, error } = await supabase
    .from('health_check_records')
    .select('*')
    .eq('id', recordId)
    .maybeSingle()
  if (error || !record) return null
  if (employeeId && record.employee_id !== employeeId) return null

  const [campaignRes, instRes, notesRes, itemsRes, itemMasterRes, codesRes] = await Promise.all([
    supabase.from('health_check_campaigns').select('*').eq('id', record.campaign_id).maybeSingle(),
    record.institution_id
      ? supabase
          .from('health_check_institutions')
          .select('*')
          .eq('id', record.institution_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('health_check_medical_notes').select('*').eq('record_id', recordId).maybeSingle(),
    supabase.from('health_check_item_results').select('*').eq('record_id', recordId),
    supabase.from('health_check_items').select('*'),
    supabase.from('health_check_judgment_codes').select('*'),
  ])

  const itemById = new Map<string, HealthCheckItem>(
    (itemMasterRes.data ?? []).map((i: HealthCheckItem) => [i.id, i])
  )
  const codeById = new Map<string, string>(
    (codesRes.data ?? []).map((c: HealthCheckJudgmentCode) => [c.id, c.code])
  )

  return {
    record,
    campaign: campaignRes.data ?? null,
    institution: instRes.data ?? null,
    overallStandardCode: record.standard_overall_judgment_id
      ? (codeById.get(record.standard_overall_judgment_id) ?? null)
      : null,
    notes: (notesRes.data as HealthCheckMedicalNote | null) ?? null,
    items: (itemsRes.data ?? [])
      .map((result: any) => {
        const item = itemById.get(result.item_id)
        if (!item) return null
        return {
          item,
          result,
          standardJudgmentCode: result.standard_judgment_id
            ? (codeById.get(result.standard_judgment_id) ?? null)
            : null,
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.item.sort_order - b.item.sort_order),
  }
}

/** 当該従業員の受診結果。今回を先頭に最大2回（過去比較用） */
export async function getEmployeeResultHistory(
  employeeId: string,
  currentRecordId: string,
  limit = 2
): Promise<EmployeeResultView[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_records')
    .select('id, exam_date')
    .eq('employee_id', employeeId)
    .order('exam_date', { ascending: false })
  if (error) {
    console.error('getEmployeeResultHistory', error)
    return []
  }
  const rows = (data ?? []) as { id: string; exam_date: string }[]
  const current = rows.find(r => r.id === currentRecordId)
  // 今回＋それより前の受診のみ（新しい回は比較に含めない）
  const past = current
    ? rows.filter(r => r.id !== currentRecordId && r.exam_date <= current.exam_date)
    : rows.filter(r => r.id !== currentRecordId)
  const picked = [current, ...past]
    .filter((r): r is { id: string; exam_date: string } => Boolean(r))
    .slice(0, limit)

  const views: EmployeeResultView[] = []
  for (const r of picked) {
    const v = await getEmployeeResultView(r.id, employeeId)
    if (v) views.push(v)
  }
  return views
}

export async function getDoctorQueue(
  campaignId?: string
): Promise<
  (HrRecordRow & { overall_standard_code: string | null; doctor_judgment_code: string | null })[]
> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await getSupabase()

  let q = supabase
    .from('health_check_records')
    .select(
      `
      id, employee_id, exam_date, status, employment_judgment,
      nurse_interview_recommended, doctor_interview_recommended, institution_id,
      standard_overall_judgment_id,
      employees:employee_id ( name, employee_no, divisions:division_id ( name ) ),
      institutions:institution_id ( name ),
      judgment:standard_overall_judgment_id ( code ),
      notes:health_check_medical_notes ( doctor_judgment_code )
    `
    )
    .eq('tenant_id', user.tenant_id)
    .order('exam_date', { ascending: false })

  if (campaignId) q = q.eq('campaign_id', campaignId)

  const { data, error } = await q
  if (error) {
    console.error('getDoctorQueue', error)
    return []
  }

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    employee_id: r.employee_id,
    employee_name: r.employees?.name ?? '',
    employee_no: r.employees?.employee_no ?? null,
    division_name: r.employees?.divisions?.name ?? null,
    exam_date: r.exam_date,
    status: r.status,
    employment_judgment: r.employment_judgment,
    nurse_interview_recommended: r.nurse_interview_recommended,
    doctor_interview_recommended: r.doctor_interview_recommended,
    institution_name: r.institutions?.name ?? null,
    overall_standard_code: r.judgment?.code ?? null,
    doctor_judgment_code: Array.isArray(r.notes)
      ? (r.notes[0]?.doctor_judgment_code ?? null)
      : (r.notes?.doctor_judgment_code ?? null),
  }))

  return rows.sort((a, b) => {
    if (a.employment_judgment === 'pending' && b.employment_judgment !== 'pending') return -1
    if (a.employment_judgment !== 'pending' && b.employment_judgment === 'pending') return 1
    return 0
  })
}

export async function getLatestHealthCheckSummaryForEmployee(
  employeeId: string
): Promise<HealthCheckSummaryForInterview | null> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('health_check_records')
    .select(
      `
      exam_date, employment_judgment,
      nurse_interview_recommended, doctor_interview_recommended,
      judgment:standard_overall_judgment_id ( code )
    `
    )
    .eq('employee_id', employeeId)
    .order('exam_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return {
    examDate: data.exam_date,
    overallStandardCode: data.judgment?.code ?? null,
    employmentJudgment: data.employment_judgment,
    nurseInterviewRecommended: data.nurse_interview_recommended,
    doctorInterviewRecommended: data.doctor_interview_recommended,
  }
}
