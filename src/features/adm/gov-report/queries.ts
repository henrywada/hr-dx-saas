import { createClient } from '@/lib/supabase/server'

export interface GovReportSummary {
  period_id: string
  period_title: string
  fiscal_year: number
  workplace_name: string | null
  workplace_address: string | null
  labor_office_name: string | null

  targetWorkers: number
  testedWorkers: number
  highStressWorkers: number
  interviewedWorkers: number

  opinionNormal: number
  opinionRestricted: number
  opinionLeave: number
}

/**
 * 労基署へ提出する「心理的な負担の程度を把握するための検査結果等報告書」
 * に必要な集計データを、指定された実施期間IDを基に算出します。
 */
export async function getGovReportSummary(periodId: string): Promise<GovReportSummary | null> {
  const supabase = await createClient()

  // 1. 対象の期間情報を取得
  const { data: period } = await supabase
    .from('stress_check_periods')
    .select(
      'id, title, fiscal_year, tenant_id, workplace_name, workplace_address, labor_office_name'
    )
    .eq('id', periodId)
    .single()

  if (!period) return null

  const tenantId = period.tenant_id

  // 2. 対象労働者数 (その事業所の在籍労働者数を概算。厳密にはactive_status等で絞る運用になりますが、全件カウント)
  const { count: targetWorkers } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  // 3. 検査を実施した労働者数 (提出済みの件数)
  const { count: testedWorkers } = await supabase
    .from('stress_check_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('period_id', periodId)
    .eq('status', 'submitted')

  // 4. 高ストレス者数
  const { count: highStressWorkers } = await supabase
    .from('stress_check_results')
    .select('id', { count: 'exact', head: true })
    .eq('period_id', periodId)
    .eq('is_high_stress', true)

  // 5. 面接指導数および、産業医の意見に基づく就業情報の内訳
  const { data: interviews } = await supabase
    .from('stress_check_interviews')
    .select('interview_status, doctor_opinion')
    .eq('period_id', periodId)

  let interviewedWorkers = 0
  let opinionNormal = 0
  let opinionRestricted = 0
  let opinionLeave = 0

  if (interviews) {
    for (const iv of interviews) {
      if (iv.interview_status === 'completed') {
        interviewedWorkers++
        // 産業医の意見（就業上の措置）をカウント
        if (iv.doctor_opinion === '通常勤務') opinionNormal++
        else if (iv.doctor_opinion === '就業制限') opinionRestricted++
        else if (iv.doctor_opinion === '要休業') opinionLeave++
      }
    }
  }

  return {
    period_id: period.id,
    period_title: period.title,
    fiscal_year: period.fiscal_year,
    workplace_name: period.workplace_name ?? null,
    workplace_address: period.workplace_address ?? null,
    labor_office_name: period.labor_office_name ?? null,
    targetWorkers: targetWorkers || 0,
    testedWorkers: testedWorkers || 0,
    highStressWorkers: highStressWorkers || 0,
    interviewedWorkers,
    opinionNormal,
    opinionRestricted,
    opinionLeave,
  }
}

/**
 * テナント内のすべての実施期間を取得します
 */
export async function getPeriods(tenantId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stress_check_periods')
    .select('id, title, fiscal_year, start_date')
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })

  return data || []
}
