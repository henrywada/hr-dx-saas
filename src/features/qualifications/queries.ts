import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { EmployeeQualificationRow, QualificationMaster } from './types'

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const limit = new Date()
  limit.setDate(limit.getDate() + 90)
  return expiry <= limit && expiry >= new Date()
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

export async function getQualificationMasters(): Promise<QualificationMaster[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qualifications')
    .select('id, name, issuing_body, renewal_years, created_at')
    .eq('tenant_id', user.tenant_id)
    .order('name')

  if (error || !data) return []
  return data as QualificationMaster[]
}

export async function getEmployeeQualifications(): Promise<EmployeeQualificationRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employee_qualifications')
    .select(
      'id, employee_id, qualification_id, acquired_date, expiry_date, cert_number, employees(name, divisions(name)), qualifications(name)',
    )
    .eq('tenant_id', user.tenant_id)
    .order('expiry_date', { ascending: true, nullsFirst: false })

  if (error || !data) return []

  return (data as any[]).map(row => {
    const emp = row.employees
    const qual = row.qualifications
    const divData = emp?.divisions
    const divisionName = Array.isArray(divData) ? divData[0]?.name : divData?.name
    const expiry = row.expiry_date as string | null

    return {
      id: row.id,
      employee_id: row.employee_id,
      employee_name: emp?.name ?? '',
      division_name: divisionName ?? null,
      qualification_id: row.qualification_id,
      qualification_name: qual?.name ?? '',
      acquired_date: row.acquired_date,
      expiry_date: expiry,
      cert_number: row.cert_number,
      is_expiring_soon: isExpiringSoon(expiry),
      is_expired: isExpired(expiry),
    } satisfies EmployeeQualificationRow
  })
}
