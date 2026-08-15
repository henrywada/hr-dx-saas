import type { PlanType } from '@/features/signup/types'

export type PlanConfigRow = {
  planType: PlanType
  label: string
  maxEmployees: number
  initialStatus: 'active' | 'pending'
  paymentMethod: 'free' | 'card' | 'bank_transfer'
  paymentStatus: 'paid' | 'pending_transfer' | 'unpaid'
  contractMonths: number | null
  available: boolean
  templateTenantName: string
  stripePriceIdEnv?: string
}

export type PlanConfigUpdateInput = {
  label: string
  maxEmployees: number
  initialStatus: 'active' | 'pending'
  paymentMethod: 'free' | 'card' | 'bank_transfer'
  paymentStatus: 'paid' | 'pending_transfer' | 'unpaid'
  contractMonths: number | null
  available: boolean
}
