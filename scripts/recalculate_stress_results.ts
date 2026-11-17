/**
 * stress_check_responses + stress_check_submissions から
 * stress_check_results を再計算して投入するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/recalculate_stress_results.ts            # 再計算して保存
 *   npx tsx scripts/recalculate_stress_results.ts --dry-run  # 保存せず、高ストレス判定の変化だけ表示
 *
 * 接続先は .env.local の NEXT_PUBLIC_SUPABASE_URL。本番に向けて実行する場合は事前に承認を取ること。
 *
 * 前提: .env.local に NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が設定されていること
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import {
  calculateScoresFromResponses,
  toStressGender,
} from '../src/features/stress-check/score-calculator'
import type { MergedResponse } from '../src/features/stress-check/score-calculator'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'エラー: NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください'
  )
  process.exit(1)
}

const isDryRun = process.argv.includes('--dry-run')

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PAGE_SIZE = 1000

/** Supabase の 1 リクエスト上限（既定 1000 行）を超えて全件取得する */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

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
  console.log(`接続先: ${new URL(supabaseUrl).host}`)
  console.log(
    isDryRun
      ? 'stress_check_results の再計算を試算します（保存しません）...\n'
      : 'stress_check_results の再計算を開始します...\n'
  )

  // 変化の比較用に、保存済みの高ストレス判定を取得する
  const existing = await fetchAll<{ period_id: string; employee_id: string; is_high_stress: boolean | null }>(
    (from, to) =>
      admin
        .from('stress_check_results')
        .select('period_id, employee_id, is_high_stress')
        .order('id')
        .range(from, to)
  )
  const storedHighStress = new Map(
    existing.map(r => [`${r.period_id}:${r.employee_id}`, r.is_high_stress])
  )
  let becameHigh = 0
  let becameNotHigh = 0
  let newHighTotal = 0

  const submissions = await fetchAll<{
    id: string
    tenant_id: string
    period_id: string
    employee_id: string
  }>((from, to) =>
    admin
      .from('stress_check_submissions')
      .select('id, tenant_id, period_id, employee_id, employees(sex)')
      .eq('status', 'submitted')
      .order('id')
      .range(from, to)
  )

  if (submissions.length === 0) {
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
    const gender = toStressGender(empData?.sex)
    const calculated = calculateScoresFromResponses(merged, gender)
    const before = storedHighStress.get(`${sub.period_id}:${sub.employee_id}`)
    if (calculated.is_high_stress) newHighTotal++
    if (before === false && calculated.is_high_stress) becameHigh++
    if (before === true && !calculated.is_high_stress) becameNotHigh++

    if (isDryRun) {
      successCount++
      continue
    }

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
  console.log(`${isDryRun ? '試算' : '完了'}: 対象 ${successCount} 件, スキップ ${skipCount} 件`)
  console.log(`再計算後の高ストレス者: ${newHighTotal} 件`)
  console.log(`  非該当 → 高ストレス: ${becameHigh} 件`)
  console.log(`  高ストレス → 非該当: ${becameNotHigh} 件`)
  console.log('========================================')
}

main().catch(err => {
  console.error('予期しないエラー:', err)
  process.exit(1)
})
