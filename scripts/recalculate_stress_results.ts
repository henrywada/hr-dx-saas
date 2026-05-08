/**
 * stress_check_responses + stress_check_submissions から
 * stress_check_results を再計算して投入するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/recalculate_stress_results.ts
 *
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が設定されていること
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { calculateScoresFromResponses } from '../src/features/stress-check/score-calculator'
import type { MergedResponse } from '../src/features/stress-check/score-calculator'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'エラー: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください'
  )
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function getMergedResponses(
  periodId: string,
  employeeId: string
): Promise<MergedResponse[] | null> {
  const { data: responses, error: respError } = await admin
    .from('stress_check_responses')
    .select(
      `
      answer,
      answered_at,
      question_id,
      stress_check_questions (
        id,
        category,
        question_no,
        question_text,
        is_reverse,
        score_weights,
        scale_name
      )
    `
    )
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)

  if (respError || !responses || responses.length === 0) {
    return null
  }
  return responses as unknown as MergedResponse[]
}

async function main() {
  console.log('stress_check_results の再計算を開始します...\n')

  const { data: submissions, error: subError } = await admin
    .from('stress_check_submissions')
    .select('id, tenant_id, period_id, employee_id, employees(sex)')
    .eq('status', 'submitted')

  if (subError) {
    console.error('提出データの取得に失敗:', subError.message)
    process.exit(1)
  }

  if (!submissions || submissions.length === 0) {
    console.log('提出済みデータがありません。終了します。')
    return
  }

  console.log(`提出済み件数: ${submissions.length} 件\n`)

  let successCount = 0
  let skipCount = 0

  for (const sub of submissions) {
    const merged = await getMergedResponses(sub.period_id, sub.employee_id)
    if (!merged || merged.length === 0) {
      console.warn(
        `  スキップ: period=${sub.period_id.slice(0, 8)}... employee=${sub.employee_id.slice(0, 8)}... (回答データなし)`
      )
      skipCount++
      continue
    }

    const empData = (sub as unknown as { employees: { sex: string | null } | null }).employees
    const gender: 'male' | 'female' = empData?.sex === 'female' ? 'female' : 'male'
    const calculated = calculateScoresFromResponses(merged, gender)
    const now = new Date().toISOString()

    const { error: upsertError } = await admin.from('stress_check_results').upsert(
      {
        tenant_id: sub.tenant_id,
        period_id: sub.period_id,
        employee_id: sub.employee_id,
        score_a: calculated.score_a,
        score_b: calculated.score_b,
        score_c: calculated.score_c,
        score_d: calculated.score_d,
        is_high_stress: calculated.is_high_stress,
        scale_scores: calculated.scale_scores,
        needs_interview: calculated.is_high_stress,
        calculated_at: now,
      },
      { onConflict: 'period_id, employee_id' }
    )

    if (upsertError) {
      console.error(
        `  エラー: period=${sub.period_id} employee=${sub.employee_id}:`,
        upsertError.message
      )
      continue
    }

    successCount++
    console.log(
      `  OK: employee=${sub.employee_id.slice(0, 8)}... A=${calculated.score_a} B=${calculated.score_b} C=${calculated.score_c} D=${calculated.score_d} high=${calculated.is_high_stress}`
    )
  }

  console.log('\n========================================')
  console.log(`完了: 成功 ${successCount} 件, スキップ ${skipCount} 件`)
  console.log('========================================')
}

main().catch(err => {
  console.error('予期しないエラー:', err)
  process.exit(1)
})
