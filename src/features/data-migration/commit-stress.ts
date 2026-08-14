import { normalizeEmployeeNo } from '@/features/health-check/csv-parse'
import { toJSTISOString } from '@/lib/datetime'
import {
  calculateScoresFromResponses,
  type MergedResponse,
} from '@/features/stress-check/score-calculator'
import { japaneseFiscalYear, sexForStressScoring } from './dates'
import type { StressCsvRow } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

type QuestionRow = {
  id: string
  question_no: number
  sort_order: number
  category: string | null
  question_text: string | null
  is_reverse: boolean | null
  score_weights: unknown
  scale_name: string | null
}

async function ensurePeriod(
  supabase: AnyClient,
  tenantId: string,
  ymd: string
): Promise<{ id: string; error?: string }> {
  const title = `移行 ${ymd}`
  const fy = japaneseFiscalYear(ymd)
  const { data: existing } = await supabase
    .from('stress_check_periods')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('title', title)
    .maybeSingle()
  if (existing?.id) return { id: existing.id }

  // 拠点未設定期間はテナント×年度で一意。既存があれば再利用する
  const { data: byFy } = await supabase
    .from('stress_check_periods')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('fiscal_year', fy)
    .is('division_establishment_id', null)
    .maybeSingle()
  if (byFy?.id) return { id: byFy.id }

  const { data: created, error } = await supabase
    .from('stress_check_periods')
    .insert({
      tenant_id: tenantId,
      division_establishment_id: null,
      title,
      questionnaire_type: '57',
      status: 'closed',
      start_date: ymd,
      end_date: ymd,
      fiscal_year: fy,
    })
    .select('id')
    .single()
  if (error || !created) return { id: '', error: error?.message ?? '実施期間の作成に失敗しました' }

  const { data: layer1 } = await supabase
    .from('divisions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('layer', 1)
  if ((layer1 ?? []).length > 0) {
    await supabase.from('stress_check_period_divisions').insert(
      layer1.map((d: { id: string }) => ({
        tenant_id: tenantId,
        period_id: created.id,
        division_id: d.id,
      }))
    )
  }
  return { id: created.id }
}

export async function importStressCheckMigration(input: {
  supabase: AnyClient
  tenantId: string
  rows: StressCsvRow[]
  skipErrors: boolean
}): Promise<{ imported: number; errors: string[]; error?: string }> {
  const rows = input.skipErrors ? input.rows.filter(r => !r.error && r.examDateYmd) : input.rows
  if (rows.length === 0) return { imported: 0, errors: [] }
  if (!input.skipErrors && input.rows.some(r => r.error)) {
    return { imported: 0, errors: [], error: 'ストレスチェックCSVにエラーがあります' }
  }

  const { data: questions, error: qErr } = await input.supabase
    .from('stress_check_questions')
    .select(
      'id, question_no, sort_order, category, question_text, is_reverse, score_weights, scale_name'
    )
    .eq('questionnaire_type', '57')
  if (qErr || !questions || questions.length < 57) {
    return { imported: 0, errors: [], error: '57問の質問マスタが見つかりません' }
  }
  // CSV の A1〜A57 は調査票の通し番号。question_no はカテゴリ内番号のため sort_order で対応する
  const questionByOrder = new Map<number, QuestionRow>()
  for (const q of questions as QuestionRow[]) questionByOrder.set(q.sort_order, q)

  const { data: employees } = await input.supabase
    .from('employees')
    .select('id, employee_no, sex')
    .eq('tenant_id', input.tenantId)
  const empByNo = new Map<string, { id: string; sex: string | null }>()
  for (const e of employees ?? []) {
    const no = normalizeEmployeeNo(e.employee_no)
    if (no) empByNo.set(no, { id: e.id, sex: e.sex })
  }

  const byDate = new Map<string, StressCsvRow[]>()
  for (const r of rows) {
    if (!r.examDateYmd) continue
    const list = byDate.get(r.examDateYmd) ?? []
    list.push(r)
    byDate.set(r.examDateYmd, list)
  }

  let imported = 0
  const errors: string[] = []
  for (const [ymd, group] of byDate) {
    const period = await ensurePeriod(input.supabase, input.tenantId, ymd)
    if (!period.id) {
      errors.push(period.error ?? `${ymd} の実施期間を作成できません`)
      continue
    }
    const answeredAt = toJSTISOString(new Date(`${ymd}T00:00:00+09:00`))

    for (const row of group) {
      const emp = empByNo.get(normalizeEmployeeNo(row.employeeNo))
      if (!emp) {
        errors.push(`${row.employeeNo}: 社員番号に一致する従業員がいません`)
        continue
      }

      await input.supabase
        .from('stress_check_responses')
        .delete()
        .eq('period_id', period.id)
        .eq('employee_id', emp.id)
        .eq('tenant_id', input.tenantId)

      const responseRows = []
      const merged: MergedResponse[] = []
      for (let i = 0; i < 57; i++) {
        const q = questionByOrder.get(i + 1)
        if (!q) {
          errors.push(`${row.employeeNo}: 設問 ${i + 1} がマスタにありません`)
          continue
        }
        const answer = row.answers[i]
        responseRows.push({
          tenant_id: input.tenantId,
          period_id: period.id,
          employee_id: emp.id,
          question_id: q.id,
          answer,
          answered_at: answeredAt,
        })
        merged.push({
          answer,
          question_id: q.id,
          stress_check_questions: {
            id: q.id,
            category: q.category ?? undefined,
            question_no: q.question_no,
            question_text: q.question_text,
            is_reverse: q.is_reverse ?? undefined,
            score_weights: q.score_weights,
            scale_name: q.scale_name,
          },
        })
      }

      if (responseRows.length > 0) {
        const { error: rErr } = await input.supabase
          .from('stress_check_responses')
          .insert(responseRows)
        if (rErr) {
          errors.push(`${row.employeeNo}: 回答保存 ${rErr.message}`)
          continue
        }
      }

      const { error: sErr } = await input.supabase.from('stress_check_submissions').upsert(
        {
          tenant_id: input.tenantId,
          period_id: period.id,
          employee_id: emp.id,
          status: 'submitted',
          submitted_at: answeredAt,
          consent_to_employer: true,
          consent_at: answeredAt,
        },
        { onConflict: 'period_id, employee_id' }
      )
      if (sErr) {
        errors.push(`${row.employeeNo}: 提出記録 ${sErr.message}`)
        continue
      }

      const gender = sexForStressScoring(emp.sex)
      const calculated = calculateScoresFromResponses(merged, gender)
      const { error: resErr } = await input.supabase.from('stress_check_results').upsert(
        {
          tenant_id: input.tenantId,
          period_id: period.id,
          employee_id: emp.id,
          score_a: calculated.score_a,
          score_b: calculated.score_b,
          score_c: calculated.score_c,
          score_d: calculated.score_d,
          is_high_stress: calculated.is_high_stress,
          scale_scores: calculated.scale_scores,
          needs_interview: calculated.is_high_stress,
          calculated_at: answeredAt,
        },
        { onConflict: 'period_id, employee_id' }
      )
      if (resErr) {
        errors.push(`${row.employeeNo}: 結果保存 ${resErr.message}`)
        continue
      }
      imported += 1
    }
  }

  return { imported, errors }
}
