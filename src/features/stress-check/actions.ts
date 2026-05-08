'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { toJSTISOString } from '@/lib/datetime'
import { revalidatePath } from 'next/cache'
import { getMergedResponses } from './queries'
import { calculateScoresFromResponses } from './score-calculator'
import type { MergedResponse } from './score-calculator'

interface AnswerInput {
  question_id: string
  answer: number
}

interface SubmitResult {
  success: boolean
  error?: string
}

/**
 * ストレスチェックの全回答を一括保存する Server Action
 */
export async function submitStressCheckAnswers(
  periodId: string,
  answers: AnswerInput[]
): Promise<SubmitResult> {
  try {
    // 1. 認証チェック
    const user = await getServerUser()
    if (!user || !user.tenant_id) {
      return { success: false, error: '認証エラー：ログインしてください。' }
    }

    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // 2. employees テーブルから employee_id を取得
    //    getServerUser().id は auth.users の UUID であり、
    //    stress_check_responses.employee_id は employees.id を参照するため
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, sex')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      console.error('Employee not found:', empError?.message)
      return { success: false, error: '従業員情報が見つかりません。管理者にお問い合わせください。' }
    }

    const employeeId = employee.id
    const gender: 'male' | 'female' = employee.sex === 'female' ? 'female' : 'male'

    // 3. 回答済みチェック（submissions テーブル）
    const { count: existingCount } = await db
      .from('stress_check_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('period_id', periodId)
      .eq('employee_id', employeeId)

    if ((existingCount ?? 0) > 0) {
      return { success: false, error: 'すでにこの期間のストレスチェックに回答済みです。' }
    }

    // 4. 回答データを構築
    const now = toJSTISOString()
    const responseRows = answers.map(a => ({
      tenant_id: user.tenant_id,
      period_id: periodId,
      employee_id: employeeId,
      question_id: a.question_id,
      answer: a.answer,
      answered_at: now,
    }))

    // 5. 一括INSERT (responses)
    const { error: insertError } = await db.from('stress_check_responses').insert(responseRows)

    if (insertError) {
      console.error('submitStressCheckAnswers insert error:', insertError)
      return { success: false, error: '回答の保存に失敗しました。もう一度お試しください。' }
    }

    // 6. 提出記録を保存 (submissions)
    const { error: subError } = await db.from('stress_check_submissions').upsert(
      {
        tenant_id: user.tenant_id,
        period_id: periodId,
        employee_id: employeeId,
        status: 'submitted',
        submitted_at: now,
        consent_to_employer: true,
      },
      { onConflict: 'period_id, employee_id' }
    ) // 重複防止

    if (subError) {
      console.error('submitStressCheckAnswers submission error:', subError)
      throw new Error('提出記録の保存に失敗しました')
    }

    // 7. 採点計算して stress_check_results に保存（集団分析用）
    const mergedResponses = await getMergedResponses(db, periodId, employeeId)
    if (mergedResponses && mergedResponses.length > 0) {
      const calculated = calculateScoresFromResponses(mergedResponses as MergedResponse[], gender)
      const adminDb = createAdminClient()
      const { error: resultError } = await (adminDb as any).from('stress_check_results').upsert(
        {
          tenant_id: user.tenant_id,
          period_id: periodId,
          employee_id: employeeId,
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

      if (resultError) {
        console.error('submitStressCheckAnswers stress_check_results error:', resultError)
        return { success: false, error: '結果の保存に失敗しました。管理者にお問い合わせください。' }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('submitStressCheckAnswers unexpected error:', err)
    return { success: false, error: '予期しないエラーが発生しました。' }
  }
}

/**
 * 事業者への結果提供同意を更新する Server Action
 */
export async function updateConsentStatus(
  periodId: string,
  consent: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!employee) return { success: false, error: 'Employee not found' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('stress_check_submissions')
    .update({ consent_to_employer: consent })
    .eq('period_id', periodId)
    .eq('employee_id', employee.id)

  if (error) {
    console.error('Update consent error:', error)
    return { success: false, error: '更新に失敗しました' }
  }

  return { success: true }
}

/**
 * 面談希望を申し出る Server Action
 * 高ストレス者が本人の結果画面から面談希望を登録する
 */
export async function requestInterview(
  periodId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getServerUser()
    if (!user || !user.tenant_id) {
      return { success: false, error: '認証エラー：ログインしてください。' }
    }

    const supabase = await createClient()

    // employee_id 取得
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (empError || !employee) {
      return { success: false, error: '従業員情報が見つかりません。' }
    }

    const employeeId = employee.id

    // stress_check_results を取得（RLS により本人のみ SELECT 可能）
    const { data: resultRow, error: resError } = await supabase
      .from('stress_check_results')
      .select('id, is_high_stress, interview_requested')
      .eq('period_id', periodId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (resError || !resultRow) {
      return { success: false, error: '結果データが見つかりません。' }
    }

    if (!resultRow.is_high_stress) {
      return { success: false, error: '高ストレス者に該当する方のみ面談希望を申し出られます。' }
    }

    if (resultRow.interview_requested) {
      return { success: false, error: 'すでに面談希望を申し出済みです。' }
    }

    const now = toJSTISOString()
    const adminDb = createAdminClient()

    // stress_check_results を更新
    const { error: updErr } = await (adminDb as any)
      .from('stress_check_results')
      .update({
        interview_requested: true,
        interview_requested_at: now,
      })
      .eq('id', resultRow.id)

    if (updErr) {
      console.error('requestInterview update results error:', updErr)
      return { success: false, error: '更新に失敗しました。もう一度お試しください。' }
    }

    // stress_check_interviews に pending レコードを INSERT（既存があればスキップ）
    const { data: existingInterview } = await adminDb
      .from('stress_check_interviews')
      .select('id')
      .eq('period_id', periodId)
      .eq('employee_id', employeeId)
      .maybeSingle()

    if (!existingInterview) {
      const { error: insErr } = await (adminDb as any).from('stress_check_interviews').insert({
        tenant_id: user.tenant_id,
        period_id: periodId,
        employee_id: employeeId,
        result_id: resultRow.id,
        interview_status: 'pending',
      })

      if (insErr) {
        console.error('requestInterview insert interviews error:', insErr)
        // results は更新済みなので、ここで失敗しても申出は有効とする
      }
    }

    revalidatePath('/stress-check/result')
    return { success: true }
  } catch (err) {
    console.error('requestInterview unexpected error:', err)
    return { success: false, error: '予期しないエラーが発生しました。' }
  }
}
