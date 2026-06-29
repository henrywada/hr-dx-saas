// src/features/recognition/types.ts

import { z } from 'zod'

export interface KudosRecipient {
  employee_id: string
  employee_name: string
}

/** 全社フィード表示用の1件 */
export interface KudosFeedItem {
  id: string
  tenant_id: string
  sender_employee_id: string
  sender_name: string
  message: string
  value_tag: string | null
  created_at: string
  recipients: KudosRecipient[]
  reactionCount: number
  hasReactedByMe: boolean
  /** 自分が送信者または宛先のいずれかに該当するか（フィード上のハイライト用） */
  isRelatedToMe: boolean
}

/**
 * 'use server' ファイルは async 関数以外を export できないため、
 * zod schema は actions.ts ではなくこちらに定義する。
 */
export const createKudosSchema = z.object({
  recipientEmployeeIds: z.array(z.string().uuid()).min(1, '宛先を1名以上選択してください').max(20),
  message: z.string().trim().min(1, 'メッセージを入力してください').max(500),
  valueTag: z.string().trim().max(50).optional(),
})

export type CreateKudosInput = z.infer<typeof createKudosSchema>

export const toggleReactionSchema = z.object({
  kudosId: z.string().uuid(),
})

export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>

/** 管理者向け集計: 部署別の送信・受信件数 */
export interface KudosDivisionStat {
  division_id: string | null
  division_name: string
  sentCount: number
  receivedCount: number
}

/** 管理者向け集計: 個人別の送信・受信件数ランキング */
export interface KudosPersonalRanking {
  employee_id: string
  employee_name: string
  sentCount: number
  receivedCount: number
}
