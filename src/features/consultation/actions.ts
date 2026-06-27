'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export const submitConsultationSchema = z.object({
  category: z.enum(['harassment', 'mental_health', 'workload', 'interpersonal', 'other']),
  body: z.string().min(1).max(2000),
  isAnonymous: z.boolean(),
})

export type SubmitConsultationInput = z.infer<typeof submitConsultationSchema>

export async function submitConsultation(input: SubmitConsultationInput): Promise<{ id: string }> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = submitConsultationSchema.parse(input)
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('consultations')
    .insert({
      tenant_id: user.tenant_id,
      employee_id: user.employee_id,
      category: parsed.category,
      body: parsed.body,
      is_anonymous: parsed.isAnonymous,
    })
    .select('id')
    .single()

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.CONSULTATION)
  return { id: data.id }
}

const replySchema = z.object({
  consultationId: z.string().uuid(),
  body: z.string().min(1).max(2000),
})

export async function replyToConsultation(input: z.infer<typeof replySchema>): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = replySchema.parse(input)
  const supabase = await createClient()
  const isStaff = STAFF_ROLES.includes(user.appRole ?? '')

  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('employee_id')
    .eq('id', parsed.consultationId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!consultation) throw new Error('Not found')
  if (!isStaff && consultation.employee_id !== user.employee_id) {
    throw new Error('Forbidden')
  }

  const { error } = await supabase.from('consultation_replies').insert({
    consultation_id: parsed.consultationId,
    author_employee_id: user.employee_id,
    body: parsed.body,
    is_staff_reply: isStaff,
  })

  if (error) throw error

  revalidatePath(`${APP_ROUTES.TENANT.CONSULTATION}/${parsed.consultationId}`)
}

const updateStatusSchema = z.object({
  consultationId: z.string().uuid(),
  status: z.enum(['open', 'in_progress', 'resolved']),
})

export async function updateConsultationStatus(
  input: z.infer<typeof updateStatusSchema>
): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')
  if (!STAFF_ROLES.includes(user.appRole ?? '')) throw new Error('Forbidden')

  const parsed = updateStatusSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase
    .from('consultations')
    .update({ status: parsed.status })
    .eq('id', parsed.consultationId)

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)
}
