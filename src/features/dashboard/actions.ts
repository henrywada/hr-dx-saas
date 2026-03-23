'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { toJSTISOString } from '@/lib/datetime'

const ADM_PATH = APP_ROUTES.TENANT.ADMIN

// announcements / pulse_survey_periods 等は型定義に含まれない場合があるため any でラップ
async function getSupabase() {
  return (await createClient()) as any
}

// ========== announcements ==========

export async function createAnnouncement(values: {
  title: string
  body?: string | null
  published_at?: string
  is_new?: boolean
  target_audience?: string | null
  sort_order?: number
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      tenant_id: user.tenant_id,
      title: values.title,
      body: values.body ?? null,
      published_at: values.published_at ?? toJSTISOString(),
      is_new: values.is_new ?? true,
      target_audience: values.target_audience ?? null,
      sort_order: values.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('createAnnouncement error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/announcements`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true, data }
}

export async function updateAnnouncement(
  id: string,
  updates: {
    title?: string
    body?: string | null
    published_at?: string
    is_new?: boolean
    target_audience?: string | null
    sort_order?: number
  }
) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateAnnouncement error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/announcements`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true, data }
}

export async function deleteAnnouncement(id: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('announcements').delete().eq('id', id)

  if (error) {
    console.error('deleteAnnouncement error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/announcements`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}

// ========== pulse_survey_periods ==========

export async function createPulseSurveyPeriod(values: {
  survey_period: string
  title: string
  description?: string | null
  deadline_date: string
  link_path?: string | null
  sort_order?: number
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('pulse_survey_periods')
    .insert({
      tenant_id: user.tenant_id,
      survey_period: values.survey_period,
      title: values.title,
      description: values.description ?? null,
      deadline_date: values.deadline_date,
      link_path: values.link_path ?? null,
      sort_order: values.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    console.error('createPulseSurveyPeriod error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/pulse-survey-periods`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true, data }
}

export async function updatePulseSurveyPeriod(
  id: string,
  updates: {
    survey_period?: string
    title?: string
    description?: string | null
    deadline_date?: string
    link_path?: string | null
    sort_order?: number
  }
) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('pulse_survey_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updatePulseSurveyPeriod error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/pulse-survey-periods`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true, data }
}

export async function deletePulseSurveyPeriod(id: string) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('pulse_survey_periods')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('deletePulseSurveyPeriod error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(`${ADM_PATH}/pulse-survey-periods`)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
  return { success: true }
}
