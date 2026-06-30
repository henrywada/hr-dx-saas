'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { assignQualificationSchema, createQualificationSchema } from './types'

const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

function assertHrRole(appRole: string | null | undefined): void {
  if (!appRole || !HR_ROLES.includes(appRole)) {
    throw new Error('Unauthorized')
  }
}

export async function createQualification(input: {
  name: string
  issuingBody?: string
  renewalYears?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  assertHrRole(user.appRole)

  const parsed = createQualificationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('qualifications').insert({
    tenant_id: user.tenant_id,
    name: parsed.data.name,
    issuing_body: parsed.data.issuingBody ?? null,
    renewal_years: parsed.data.renewalYears ?? null,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

export async function assignEmployeeQualification(input: {
  employeeId: string
  qualificationId: string
  acquiredDate?: string
  expiryDate?: string
  certNumber?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  assertHrRole(user.appRole)

  const parsed = assignQualificationSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.from('employee_qualifications').insert({
    tenant_id: user.tenant_id,
    employee_id: parsed.data.employeeId,
    qualification_id: parsed.data.qualificationId,
    acquired_date: parsed.data.acquiredDate ?? null,
    expiry_date: parsed.data.expiryDate ?? null,
    cert_number: parsed.data.certNumber ?? null,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

export async function deleteEmployeeQualification(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  assertHrRole(user.appRole)

  const supabase = await createClient()
  const { error } = await supabase
    .from('employee_qualifications')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}
