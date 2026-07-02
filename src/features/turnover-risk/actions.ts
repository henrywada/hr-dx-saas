'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { calculateRiskScore } from './score-calculator'
import { collectEmployeeRawData, getActionLogs } from './queries'
import { getLatestRiskLevelsBeforeUpdate } from './notification-queries'
import { detectHighRiskTransitions } from './transition-detector'
import { notifyHighRiskTransitions } from './notifications'
import { APP_ROUTES } from '@/config/routes'
import type { ActionLog, ActionType, ScoreFactors } from './types'

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

/** 全従業員のリスクスコアを再計算して保存し、新規に high へ遷移した従業員を通知する */
export async function recalculateTurnoverRiskScores(): Promise<{
  success: boolean
  updatedCount: number
  notifiedCount: number
  error?: string
}> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, updatedCount: 0, notifiedCount: 0, error: 'Unauthorized' }
  }

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    return { success: false, updatedCount: 0, notifiedCount: 0, error: 'Permission denied' }
  }

  try {
    const rawDataList = await collectEmployeeRawData()
    if (rawDataList.length === 0) {
      return { success: true, updatedCount: 0, notifiedCount: 0 }
    }

    // 通知の遷移判定用に、更新前の最新スコアを先に取得しておく
    const previousLevels = await getLatestRiskLevelsBeforeUpdate(user.tenant_id)

    const supabase = await createClient()
    const now = new Date().toISOString()

    const records = rawDataList.map(raw => {
      const { risk_score, risk_level, score_factors } = calculateRiskScore(raw)
      return {
        tenant_id: user.tenant_id!,
        employee_id: raw.employee_id,
        risk_score,
        risk_level,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        score_factors: score_factors as any,
        calculated_at: now,
      }
    })

    const { error } = await supabase.from('turnover_risk_scores').insert(records)

    if (error) {
      return { success: false, updatedCount: 0, notifiedCount: 0, error: error.message }
    }

    revalidatePath(APP_ROUTES.TENANT.ADMIN_TURNOVER_RISK)

    // スコア保存は既に成功している。通知処理の失敗でこの成功結果を上書きしない
    let notifiedCount = 0
    try {
      const transitions = detectHighRiskTransitions(previousLevels, records)
      const scoreFactorsByEmployee = new Map<string, ScoreFactors>(
        records.map(r => [r.employee_id, r.score_factors as ScoreFactors])
      )
      const result = await notifyHighRiskTransitions({
        tenantId: user.tenant_id,
        transitions,
        scoreFactorsByEmployee,
      })
      notifiedCount = result.notifiedCount
    } catch (notifyErr) {
      console.error('turnover-risk notification failed:', notifyErr)
    }

    return { success: true, updatedCount: records.length, notifiedCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, updatedCount: 0, notifiedCount: 0, error: message }
  }
}

/** アクション履歴を取得する（記録モーダルからのクライアント呼び出し用ラッパー） */
export async function fetchTurnoverRiskActionLogs(employeeId: string): Promise<ActionLog[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) return []

  return getActionLogs(employeeId)
}

const actionLogSchema = z.object({
  employeeId: z.string().uuid(),
  actionType: z.enum(['one_on_one', 'counseling', 'manager_talk', 'hr_interview', 'other']),
  notes: z.string().max(1000).optional(),
})

/** ハイリスク者へのアクションログを記録する */
export async function logTurnoverRiskAction(input: {
  employeeId: string
  actionType: ActionType
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    return { success: false, error: 'Permission denied' }
  }

  const parsed = actionLogSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('turnover_risk_action_logs').insert({
    tenant_id: user.tenant_id,
    employee_id: parsed.data.employeeId,
    logged_by: user.employee_id,
    action_type: parsed.data.actionType,
    notes: parsed.data.notes ?? null,
    actioned_at: new Date().toISOString(),
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_TURNOVER_RISK)
  return { success: true }
}
