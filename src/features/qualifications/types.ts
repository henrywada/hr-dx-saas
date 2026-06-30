import { z } from 'zod'

export interface QualificationMaster {
  id: string
  name: string
  issuing_body: string | null
  renewal_years: number | null
  created_at: string
}

export interface EmployeeQualificationRow {
  id: string
  employee_id: string
  employee_name: string
  division_name: string | null
  qualification_id: string
  qualification_name: string
  acquired_date: string | null
  expiry_date: string | null
  cert_number: string | null
  is_expiring_soon: boolean
  is_expired: boolean
}

export const createQualificationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  issuingBody: z.string().trim().max(200).optional(),
  renewalYears: z.number().int().min(1).max(50).optional(),
})

export const assignQualificationSchema = z.object({
  employeeId: z.string().uuid(),
  qualificationId: z.string().uuid(),
  acquiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  certNumber: z.string().trim().max(100).optional(),
})
