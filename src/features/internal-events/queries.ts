// src/features/internal-events/queries.ts

import { createClient } from '@/lib/supabase/server'
import type { InternalEvent, EventWithMyRsvp, EventAttendee, Award, RsvpStatus } from './types'

/** 従業員向け: 直近のイベント一覧＋本人のRSVP状態 */
export async function getUpcomingEvents(employeeId: string): Promise<EventWithMyRsvp[]> {
  const supabase = await createClient()

  const { data: events, error } = await supabase
    .from('internal_events')
    .select('id, tenant_id, title, description, event_date, location, created_by, created_at')
    .order('event_date', { ascending: true })

  if (error) {
    console.error('getUpcomingEvents error:', error)
    return []
  }
  if (!events || events.length === 0) return []

  const { data: myRsvps, error: rsvpError } = await supabase
    .from('internal_event_attendees')
    .select('event_id, rsvp_status')
    .eq('employee_id', employeeId)

  if (rsvpError) {
    console.error('getUpcomingEvents (rsvp) error:', rsvpError)
  }

  const rsvpByEventId = new Map<string, RsvpStatus>(
    (myRsvps ?? []).map(r => [r.event_id, r.rsvp_status as RsvpStatus])
  )

  return events.map(event => ({
    ...event,
    myRsvpStatus: rsvpByEventId.get(event.id) ?? 'pending',
  }))
}

/** 管理者向け: 全イベント一覧 */
export async function getAllEventsForAdmin(): Promise<InternalEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('internal_events')
    .select('id, tenant_id, title, description, event_date, location, created_by, created_at')
    .order('event_date', { ascending: false })

  if (error) {
    console.error('getAllEventsForAdmin error:', error)
    return []
  }
  return data ?? []
}

/** 管理者向け: イベント参加者一覧（氏名＋RSVP状態） */
export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('internal_event_attendees')
    .select('event_id, employee_id, rsvp_status, employees(name)')
    .eq('event_id', eventId)

  if (error) {
    console.error('getEventAttendees error:', error)
    return []
  }

  return (data ?? []).map(row => {
    const employee = row.employees as unknown as { name: string | null } | null
    return {
      event_id: row.event_id,
      employee_id: row.employee_id,
      employee_name: employee?.name ?? '（不明）',
      rsvp_status: row.rsvp_status as RsvpStatus,
    }
  })
}

/** 従業員向け: 表彰一覧の公開表示（称賛文化の可視化） */
export async function getAwardHistory(limit = 10): Promise<Award[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('awards')
    .select(
      'id, tenant_id, recipient_employee_id, award_type, period_label, comment, created_at, employees(name)'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getAwardHistory error:', error)
    return []
  }

  return (data ?? []).map(row => {
    const employee = row.employees as unknown as { name: string | null } | null
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      recipient_employee_id: row.recipient_employee_id,
      recipient_name: employee?.name ?? '（不明）',
      award_type: row.award_type,
      period_label: row.period_label,
      comment: row.comment,
      created_at: row.created_at,
    }
  })
}

/** 管理者向け: 表彰一覧 */
export async function getAwardsForAdmin(): Promise<Award[]> {
  return getAwardHistory(100)
}
