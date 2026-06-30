'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { createAnnouncement } from '@/features/dashboard/actions'
import {
  createEventSchema,
  updateEventSchema,
  deleteEventSchema,
  updateRsvpSchema,
  createAwardSchema,
  type CreateEventInput,
  type UpdateEventInput,
  type DeleteEventInput,
  type UpdateRsvpInput,
  type CreateAwardInput,
} from './types'
import { normalizeEventAudienceInput } from './event-audience'

const HR_ROLES = ['hr', 'hr_manager']

function assertHrRole(appRole: string | null | undefined): void {
  if (!appRole || !HR_ROLES.includes(appRole)) {
    throw new Error('Unauthorized')
  }
}

/** イベント作成（hr/hr_managerのみ） */
export async function createEvent(input: CreateEventInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')
  assertHrRole(user.appRole)

  const parsed = createEventSchema.parse(input)
  const audience = normalizeEventAudienceInput(parsed)
  const supabase = await createClient()

  const { error } = await supabase.from('internal_events').insert({
    tenant_id: user.tenant_id,
    title: parsed.title,
    description: parsed.description ?? null,
    event_date: parsed.event_date,
    location: parsed.location ?? null,
    audience_type: audience.audience_type,
    division_id: audience.division_id,
    created_by: user.employee_id,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.EVENTS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_EVENTS_AWARDS)
}

/** イベント更新（hr/hr_managerのみ） */
export async function updateEvent(input: UpdateEventInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')
  assertHrRole(user.appRole)

  const parsed = updateEventSchema.parse(input)
  const audience = normalizeEventAudienceInput(parsed)
  const supabase = await createClient()

  const { error } = await supabase
    .from('internal_events')
    .update({
      title: parsed.title,
      description: parsed.description ?? null,
      event_date: parsed.event_date,
      location: parsed.location ?? null,
      audience_type: audience.audience_type,
      division_id: audience.division_id,
    })
    .eq('id', parsed.id)
    .eq('tenant_id', user.tenant_id)

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.EVENTS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_EVENTS_AWARDS)
}

/** イベント削除（hr/hr_managerのみ） */
export async function deleteEvent(input: DeleteEventInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')
  assertHrRole(user.appRole)

  const parsed = deleteEventSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('internal_events')
    .delete()
    .eq('id', parsed.id)
    .eq('tenant_id', user.tenant_id)

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.EVENTS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_EVENTS_AWARDS)
}

/** 本人のRSVP状態を更新（upsert） */
export async function updateRsvp(input: UpdateRsvpInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = updateRsvpSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase.from('internal_event_attendees').upsert(
    {
      event_id: parsed.eventId,
      employee_id: user.employee_id,
      rsvp_status: parsed.rsvpStatus,
    },
    { onConflict: 'event_id,employee_id' }
  )

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.EVENTS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_EVENTS_AWARDS)
}

/** 表彰登録（hr/hr_managerのみ）。publishAnnouncementが真の場合は既存お知らせ機能に連携投稿する */
export async function createAward(input: CreateAwardInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')
  assertHrRole(user.appRole)

  const parsed = createAwardSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase.from('awards').insert({
    tenant_id: user.tenant_id,
    recipient_employee_id: parsed.recipientEmployeeId,
    award_type: parsed.awardType,
    period_label: parsed.periodLabel,
    comment: parsed.comment ?? null,
    created_by: user.employee_id,
  })

  if (error) throw error

  if (parsed.publishAnnouncement) {
    await createAnnouncement({
      title: `🏆 ${parsed.periodLabel} ${parsed.awardType}`,
      body: parsed.comment ?? null,
      target_audience: null,
    })
  }

  revalidatePath(APP_ROUTES.TENANT.EVENTS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_EVENTS_AWARDS)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
}
