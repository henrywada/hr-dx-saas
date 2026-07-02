import { createClient } from '@/lib/supabase/server'
import { resolveEmployeeEmail } from '@/lib/mail/resolve-employee-email'
import { sendMail } from '@/lib/mail/send'
import { APP_ROUTES } from '@/config/routes'
import {
  getDivisionManagerEmployeeIds,
  getHrDigestRecipientEmployeeIds,
} from '@/lib/notifications/recipient-queries'
import { getRecentlyNotifiedDivisionIds } from './alert-notification-queries'
import {
  formatEngagementFactorLines,
  buildManagerAlertEmail,
  buildHrDigestEmail,
} from './alert-notification-mail'
import type { AlertTransition } from './alert-transition-detector'
import type { DepartmentEngagementRow } from './types'

type AlertRecipientType = 'manager' | 'hr_digest' | 'no_manager_fallback'
type AlertStatus = 'sent' | 'failed' | 'skipped'

interface AlertLogEntry {
  tenant_id: string
  division_id: string
  composite_score: number
  previous_status: string
  recipient_employee_id: string | null
  recipient_type: AlertRecipientType
  channel: 'email'
  status: AlertStatus
  error_message: string | null
}

interface DigestTransition {
  divisionName: string
  compositeScore: number
}

function dashboardUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://app.hr-dx.jp'
  return `${base}${APP_ROUTES.TENANT.ADMIN_ENGAGEMENT}`
}

/** 従業員IDにメールを解決して送信し、結果に応じたステータスを返す（例外を握りつぶさず状態化する） */
async function resolveAndSend(
  recipientEmployeeId: string,
  tenantId: string,
  message: { subject: string; html: string }
): Promise<{ status: AlertStatus; errorMessage: string | null }> {
  try {
    const email = await resolveEmployeeEmail(recipientEmployeeId, tenantId)
    if (!email) {
      return { status: 'skipped', errorMessage: 'メールアドレスを解決できませんでした' }
    }
    await sendMail({ to: email, subject: message.subject, html: message.html })
    return { status: 'sent', errorMessage: null }
  } catch (err) {
    return { status: 'failed', errorMessage: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/** 部署の管理職へ個別アラートメールを送信し、監査ログ行を返す */
async function sendManagerAlerts(params: {
  tenantId: string
  transition: AlertTransition
  divisionInfo: DepartmentEngagementRow | undefined
  dashboardUrl: string
}): Promise<AlertLogEntry[]> {
  const { tenantId, transition, divisionInfo, dashboardUrl: url } = params
  const divisionName = divisionInfo?.divisionName ?? '(不明な部署)'

  const managerIds = await getDivisionManagerEmployeeIds(tenantId, transition.division_id)

  const baseLog = {
    tenant_id: tenantId,
    division_id: transition.division_id,
    composite_score: transition.composite_score,
    previous_status: transition.previous_status,
  }

  if (managerIds.length === 0) {
    return [
      {
        ...baseLog,
        recipient_employee_id: null,
        recipient_type: 'no_manager_fallback',
        channel: 'email',
        status: 'skipped',
        error_message: '当該部署に稼働中の管理職が存在しません',
      },
    ]
  }

  const factorLines = divisionInfo
    ? formatEngagementFactorLines({
        pulseScore: divisionInfo.pulseScore,
        highStressRate: divisionInfo.highStressRate,
        questionnaireResponseRate: divisionInfo.questionnaireResponseRate,
      })
    : []

  const message = buildManagerAlertEmail({
    divisionName,
    compositeScore: transition.composite_score,
    factorLines,
    dashboardUrl: url,
  })

  const logs: AlertLogEntry[] = []
  for (const managerId of managerIds) {
    const { status, errorMessage } = await resolveAndSend(managerId, tenantId, message)
    logs.push({
      ...baseLog,
      recipient_employee_id: managerId,
      recipient_type: 'manager',
      channel: 'email',
      status,
      error_message: errorMessage,
    })
  }
  return logs
}

/**
 * 人事へダイジェストメールを送信する。1受信者につき送信は1通のみ。
 * 監査ログは対象部署の数だけ、同じ送信結果を紐づけて記録する。
 */
async function sendHrDigest(params: {
  tenantId: string
  transitions: AlertTransition[]
  digestTransitions: DigestTransition[]
  dashboardUrl: string
}): Promise<AlertLogEntry[]> {
  const { tenantId, transitions, digestTransitions, dashboardUrl: url } = params
  const hrRecipientIds = await getHrDigestRecipientEmployeeIds(tenantId)
  const digestMessage = buildHrDigestEmail({ transitions: digestTransitions, dashboardUrl: url })

  const logs: AlertLogEntry[] = []
  for (const hrId of hrRecipientIds) {
    const { status, errorMessage } = await resolveAndSend(hrId, tenantId, digestMessage)
    for (const transition of transitions) {
      logs.push({
        tenant_id: tenantId,
        division_id: transition.division_id,
        composite_score: transition.composite_score,
        previous_status: transition.previous_status,
        recipient_employee_id: hrId,
        recipient_type: 'hr_digest',
        channel: 'email',
        status,
        error_message: errorMessage,
      })
    }
  }
  return logs
}

/**
 * 新規に alert へ遷移した部署について、管理職へ個別メール・人事へダイジェストメールを送信する。
 * 1件の送信失敗が他の対象部署への通知を止めないよう、対象部署ごとに独立して処理する。
 * 直近に送信済みの部署は、同時実行等による重複通知を避けるため対象から除外する。
 */
export async function notifyAlertTransitions(params: {
  tenantId: string
  transitions: AlertTransition[]
  divisionInfoById: Map<string, DepartmentEngagementRow>
}): Promise<{ notifiedCount: number }> {
  const { tenantId, divisionInfoById } = params

  const recentlyNotified = await getRecentlyNotifiedDivisionIds(
    tenantId,
    params.transitions.map(t => t.division_id)
  )
  const transitions = params.transitions.filter(t => !recentlyNotified.has(t.division_id))
  if (transitions.length === 0) return { notifiedCount: 0 }

  const url = dashboardUrl()
  const alertLogs: AlertLogEntry[] = []
  const digestTransitions: DigestTransition[] = []

  for (const transition of transitions) {
    const info = divisionInfoById.get(transition.division_id)
    digestTransitions.push({
      divisionName: info?.divisionName ?? '(不明な部署)',
      compositeScore: transition.composite_score,
    })

    const managerLogs = await sendManagerAlerts({
      tenantId,
      transition,
      divisionInfo: info,
      dashboardUrl: url,
    })
    alertLogs.push(...managerLogs)
  }

  const hrLogs = await sendHrDigest({ tenantId, transitions, digestTransitions, dashboardUrl: url })
  alertLogs.push(...hrLogs)

  if (alertLogs.length > 0) {
    const supabase = await createClient()
    const { error } = await supabase.from('engagement_department_alerts').insert(alertLogs)
    if (error) {
      console.error('engagement_department_alerts insert failed:', error.message)
    }
  }

  const notifiedDivisionIds = new Set(
    alertLogs.filter(log => log.status === 'sent').map(log => log.division_id)
  )
  return { notifiedCount: notifiedDivisionIds.size }
}
