// src/features/internal-events/types.ts

import { z } from 'zod'

export type RsvpStatus = 'pending' | 'attending' | 'declined'

export interface InternalEvent {
  id: string
  tenant_id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  created_by: string
  created_at: string
}

/** 従業員向け一覧表示用: イベント本体＋本人のRSVP状態 */
export interface EventWithMyRsvp extends InternalEvent {
  myRsvpStatus: RsvpStatus
}

export interface EventAttendee {
  event_id: string
  employee_id: string
  employee_name: string
  rsvp_status: RsvpStatus
}

export interface Award {
  id: string
  tenant_id: string
  recipient_employee_id: string
  recipient_name: string
  award_type: string
  period_label: string
  comment: string | null
  created_at: string
}

/**
 * 'use server' ファイルは async 関数以外を export できないため、
 * zod schema は actions.ts ではなくこちらに定義する。
 */
export const createEventSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください').max(200),
  description: z.string().trim().max(2000).optional(),
  event_date: z.string().min(1, '開催日時を入力してください'),
  location: z.string().trim().max(200).optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>

export const updateRsvpSchema = z.object({
  eventId: z.string().uuid(),
  rsvpStatus: z.enum(['pending', 'attending', 'declined']),
})

export type UpdateRsvpInput = z.infer<typeof updateRsvpSchema>

export const createAwardSchema = z.object({
  recipientEmployeeId: z.string().uuid(),
  awardType: z.string().trim().min(1, '表彰名を入力してください').max(100),
  periodLabel: z.string().trim().min(1, '対象期間を入力してください').max(50),
  comment: z.string().trim().max(1000).optional(),
  publishAnnouncement: z.boolean().optional(),
})

export type CreateAwardInput = z.infer<typeof createAwardSchema>
