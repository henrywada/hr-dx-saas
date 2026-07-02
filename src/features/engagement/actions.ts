'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { getEngagementDashboardData } from './queries'
import { getLatestDivisionStatusesBeforeUpdate } from './alert-notification-queries'
import { detectAlertTransitions } from './alert-transition-detector'
import { notifyAlertTransitions } from './alert-notifications'
import { APP_ROUTES } from '@/config/routes'
import type { DepartmentEngagementRow } from './types'

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

/**
 * 選択された階層（layer）の部署別エンゲージメント状態を記録し、
 * 新規に alert へ遷移した部署について管理職・人事へ自動通知する。
 */
export async function recordEngagementSnapshot(layerFilter: number | 'all'): Promise<{
  success: boolean
  snapshotCount: number
  notifiedCount: number
  error?: string
}> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, snapshotCount: 0, notifiedCount: 0, error: 'Unauthorized' }
  }

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    return { success: false, snapshotCount: 0, notifiedCount: 0, error: 'Permission denied' }
  }

  try {
    const data = await getEngagementDashboardData()
    const targetDepartments =
      layerFilter === 'all'
        ? data.departments
        : data.departments.filter(d => d.layer === layerFilter)

    if (targetDepartments.length === 0) {
      return { success: true, snapshotCount: 0, notifiedCount: 0 }
    }

    // 通知の遷移判定用に、更新前の最新ステータスを先に取得しておく（対象部署ごとに個別取得）
    const previousStatuses = await getLatestDivisionStatusesBeforeUpdate(
      user.tenant_id,
      targetDepartments.map(d => d.divisionId)
    )

    const supabase = await createClient()
    const now = new Date().toISOString()

    const records = targetDepartments.map(d => ({
      tenant_id: user.tenant_id!,
      division_id: d.divisionId,
      composite_score: d.compositeScore,
      status: d.status,
      score_breakdown: {
        pulse_score: d.pulseScore,
        high_stress_rate: d.highStressRate,
        questionnaire_response_rate: d.questionnaireResponseRate,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      calculated_at: now,
    }))

    const { error } = await supabase.from('engagement_department_scores').insert(records)

    if (error) {
      return { success: false, snapshotCount: 0, notifiedCount: 0, error: error.message }
    }

    revalidatePath(APP_ROUTES.TENANT.ADMIN_ENGAGEMENT)

    // スナップショット保存は既に成功している。通知処理の失敗でこの成功結果を上書きしない
    let notifiedCount = 0
    try {
      const transitions = detectAlertTransitions(
        previousStatuses,
        records.map(r => ({
          division_id: r.division_id,
          composite_score: r.composite_score,
          status: r.status,
        }))
      )
      const divisionInfoById = new Map<string, DepartmentEngagementRow>(
        targetDepartments.map(d => [d.divisionId, d])
      )
      const result = await notifyAlertTransitions({
        tenantId: user.tenant_id,
        transitions,
        divisionInfoById,
      })
      notifiedCount = result.notifiedCount
    } catch (notifyErr) {
      console.error('engagement alert notification failed:', notifyErr)
    }

    return { success: true, snapshotCount: records.length, notifiedCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, snapshotCount: 0, notifiedCount: 0, error: message }
  }
}
