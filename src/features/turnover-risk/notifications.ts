import { createClient } from '@/lib/supabase/server'
import { resolveEmployeeEmail } from '@/lib/mail/resolve-employee-email'
import { sendMail } from '@/lib/mail/send'
import { APP_ROUTES } from '@/config/routes'
import {
  getEmployeeDisplayInfo,
  getDivisionManagerEmployeeIds,
  getHrDigestRecipientEmployeeIds,
  getRecentlyNotifiedEmployeeIds,
  type EmployeeDisplayInfo,
} from './notification-queries'
import {
  describeTopRiskFactors,
  buildManagerAlertEmail,
  buildHrDigestEmail,
} from './notification-mail'
import type { HighRiskTransition } from './transition-detector'
import type { ScoreFactors } from './types'

type AlertRecipientType = 'manager' | 'hr_digest' | 'no_manager_fallback'
type AlertStatus = 'sent' | 'failed' | 'skipped'

interface AlertLogEntry {
  tenant_id: string
  employee_id: string
  risk_score: number
  previous_risk_level: string
  recipient_employee_id: string | null
  recipient_type: AlertRecipientType
  channel: 'email'
  status: AlertStatus
  error_message: string | null
}

interface DigestTransition {
  employeeName: string
  departmentName: string | null
  riskScore: number
}

function dashboardUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://app.hr-dx.jp'
  return `${base}${APP_ROUTES.TENANT.ADMIN_TURNOVER_RISK}`
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

/** 上長へ個別アラートメールを送信し、監査ログ行を返す */
async function sendManagerAlerts(params: {
  tenantId: string
  transition: HighRiskTransition
  info: EmployeeDisplayInfo | undefined
  employeeName: string
  dashboardUrl: string
  scoreFactorsByEmployee: Map<string, ScoreFactors>
}): Promise<AlertLogEntry[]> {
  const {
    tenantId,
    transition,
    info,
    employeeName,
    dashboardUrl: url,
    scoreFactorsByEmployee,
  } = params
  const departmentName = info?.department_name ?? null

  // 対象従業員自身が同一部署の管理職である場合、自分自身への通知を除外する
  const managerIds = (
    info?.division_id ? await getDivisionManagerEmployeeIds(tenantId, info.division_id) : []
  ).filter(id => id !== transition.employee_id)

  const baseLog = {
    tenant_id: tenantId,
    employee_id: transition.employee_id,
    risk_score: transition.risk_score,
    previous_risk_level: transition.previous_risk_level,
  }

  if (managerIds.length === 0) {
    return [
      {
        ...baseLog,
        recipient_employee_id: null,
        recipient_type: 'no_manager_fallback',
        channel: 'email',
        status: 'skipped',
        error_message: '同一部署に稼働中の管理職が存在しません',
      },
    ]
  }

  const factors = scoreFactorsByEmployee.get(transition.employee_id)
  const message = buildManagerAlertEmail({
    employeeName,
    departmentName,
    riskScore: transition.risk_score,
    topFactors: factors ? describeTopRiskFactors(factors) : [],
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
 * 監査ログは対象従業員の数だけ、同じ送信結果を紐づけて記録する
 * （「HRはこの従業員について通知を受けたか」を追跡可能にするため）。
 */
async function sendHrDigest(params: {
  tenantId: string
  transitions: HighRiskTransition[]
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
        employee_id: transition.employee_id,
        risk_score: transition.risk_score,
        previous_risk_level: transition.previous_risk_level,
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
 * 新規に high へ遷移した従業員について、上長へ個別メール・人事へダイジェストメールを送信する。
 * 1人のメール送信失敗が他の対象者への通知を止めないよう、対象者ごとに独立して処理する。
 * 直近に送信済みの従業員は、同時実行等による重複通知を避けるため対象から除外する。
 */
export async function notifyHighRiskTransitions(params: {
  tenantId: string
  transitions: HighRiskTransition[]
  scoreFactorsByEmployee: Map<string, ScoreFactors>
}): Promise<{ notifiedCount: number }> {
  const { tenantId, scoreFactorsByEmployee } = params

  const recentlyNotified = await getRecentlyNotifiedEmployeeIds(
    tenantId,
    params.transitions.map(t => t.employee_id)
  )
  const transitions = params.transitions.filter(t => !recentlyNotified.has(t.employee_id))
  if (transitions.length === 0) return { notifiedCount: 0 }

  const url = dashboardUrl()
  const employeeIds = transitions.map(t => t.employee_id)
  const displayInfo = await getEmployeeDisplayInfo(tenantId, employeeIds)
  const alertLogs: AlertLogEntry[] = []
  const digestTransitions: DigestTransition[] = []

  for (const transition of transitions) {
    const info = displayInfo.get(transition.employee_id)
    const employeeName = info?.name ?? '(不明な従業員)'
    digestTransitions.push({
      employeeName,
      departmentName: info?.department_name ?? null,
      riskScore: transition.risk_score,
    })

    const managerLogs = await sendManagerAlerts({
      tenantId,
      transition,
      info,
      employeeName,
      dashboardUrl: url,
      scoreFactorsByEmployee,
    })
    alertLogs.push(...managerLogs)
  }

  const hrLogs = await sendHrDigest({ tenantId, transitions, digestTransitions, dashboardUrl: url })
  alertLogs.push(...hrLogs)

  if (alertLogs.length > 0) {
    const supabase = await createClient()
    const { error } = await supabase.from('turnover_risk_alerts').insert(alertLogs)
    if (error) {
      console.error('turnover_risk_alerts insert failed:', error.message)
    }
  }

  const notifiedEmployeeIds = new Set(
    alertLogs.filter(log => log.status === 'sent').map(log => log.employee_id)
  )
  return { notifiedCount: notifiedEmployeeIds.size }
}
