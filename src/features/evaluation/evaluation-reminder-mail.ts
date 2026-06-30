import { sendMail } from '@/lib/mail/send'
import { resolveEmployeeEmail } from '@/lib/mail/resolve-employee-email'
import { FLOW_STATUS_LABELS, type FlowStatus } from './types'

type SheetForReminder = {
  employee_id: string
  flow_status: string
  primary_evaluator_id: string | null
  secondary_evaluator_id: string | null
  confirmer_id: string | null
}

/** フロー状態に応じた催促先従業員 ID */
export function getEvaluationReminderRecipientId(sheet: SheetForReminder): string {
  switch (sheet.flow_status) {
    case 'primary_eval':
      return sheet.primary_evaluator_id ?? sheet.employee_id
    case 'secondary_eval':
      return sheet.secondary_evaluator_id ?? sheet.employee_id
    case 'confirming':
      return sheet.confirmer_id ?? sheet.employee_id
    default:
      return sheet.employee_id
  }
}

/** 評価リマインドメール送信（EV-C1） */
export async function trySendEvaluationReminderEmail(params: {
  tenantId: string
  recipientEmployeeId: string
  recipientName: string
  periodName: string
  flowStatus: FlowStatus
  message?: string
  isOverdue: boolean
}): Promise<{ emailSent: boolean; emailError: string | null }> {
  const email = await resolveEmployeeEmail(params.recipientEmployeeId, params.tenantId)
  if (!email) {
    return { emailSent: false, emailError: 'メールアドレス未登録' }
  }

  const phaseLabel = FLOW_STATUS_LABELS[params.flowStatus] ?? params.flowStatus
  const subject = params.isOverdue
    ? `【HR-DX】評価入力の期限超過（${params.periodName}）`
    : `【HR-DX】評価入力のご依頼（${params.periodName}）`

  const custom = params.message?.trim() ? `\n\n${params.message.trim()}\n` : ''
  const text = `${params.recipientName} 様\n\n${params.periodName} の評価において、「${phaseLabel}」の入力が必要です。${custom}\nHR-DX にログインして評価を入力してください。`

  try {
    await sendMail({ to: email, subject, text })
    return { emailSent: true, emailError: null }
  } catch (e) {
    return {
      emailSent: false,
      emailError: e instanceof Error ? e.message : '送信失敗',
    }
  }
}
