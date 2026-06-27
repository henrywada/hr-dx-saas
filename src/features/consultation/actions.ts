'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export const submitConsultationSchema = z
  .object({
    category: z.enum(['harassment', 'mental_health', 'workload', 'interpersonal', 'other']),
    body: z.string().min(1).max(2000),
    isAnonymous: z.boolean(),
    targetType: z.enum(['medical_staff', 'hr', 'hr_manager', 'manager', 'hsc', 'other_any']),
    targetEmployeeId: z.string().uuid().optional(),
  })
  .refine(data => (data.targetType === 'manager') === (data.targetEmployeeId !== undefined), {
    message: 'targetType が manager の場合のみ targetEmployeeId が必須です',
    path: ['targetEmployeeId'],
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
      target_type: parsed.targetType,
      target_employee_id: parsed.targetType === 'manager' ? parsed.targetEmployeeId : null,
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

  const { data: consultation, error: fetchError } = await supabase
    .from('consultations')
    .select('employee_id, claimed_by')
    .eq('id', parsed.consultationId)
    .maybeSingle()

  if (fetchError) throw fetchError
  if (!consultation) throw new Error('Not found')
  if (!consultation.claimed_by) throw new Error('まだ対応者が決まっていません')

  const isOwner = consultation.employee_id === user.employee_id
  const isClaimer = consultation.claimed_by === user.employee_id
  if (!isOwner && !isClaimer) throw new Error('Forbidden')

  const { error } = await supabase.from('consultation_replies').insert({
    consultation_id: parsed.consultationId,
    author_employee_id: user.employee_id,
    body: parsed.body,
    is_staff_reply: isClaimer,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.CONSULTATION_DETAIL(parsed.consultationId))
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL(parsed.consultationId))
}

/**
 * 「対応します」ボタンによる明示的なclaim（対応宣言）。
 * UPDATE ... WHERE claimed_by IS NULL のアトミック更新で競合を解消する：
 * 更新行数が0件なら既に他者がclaim済みであり、エラーを返す（楽観的ロック）。
 * 対象者であることのチェックはRLSの consultations_claim ポリシーが担う。
 */
export async function claimConsultation(consultationId: string): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .update({ claimed_by: user.employee_id, claimed_at: new Date().toISOString() })
    .eq('id', consultationId)
    .is('claimed_by', null)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('既に他の方が対応中です')
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE_DETAIL(consultationId))
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
    .eq('claimed_by', user.employee_id)

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)
}
