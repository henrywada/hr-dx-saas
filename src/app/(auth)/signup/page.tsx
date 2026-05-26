import { SignupWizard } from '@/features/signup/components/SignupWizard'
import type { PlanType } from '@/features/signup/types'

interface SignupPageProps {
  searchParams: Promise<{ plan?: string }>
}

function isValidPlan(value: unknown): value is PlanType {
  return value === 'free' || value === 'pro' || value === 'enterprise'
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const plan: PlanType = isValidPlan(params.plan) ? params.plan : 'free'

  return <SignupWizard initialPlan={plan} />
}
