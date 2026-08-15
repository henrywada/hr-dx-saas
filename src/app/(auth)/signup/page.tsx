import { SignupWizard } from '@/features/signup/components/SignupWizard'
import { PlanComingSoon } from '@/features/signup/components/PlanComingSoon'
import { PLAN_CONFIG, type PlanType } from '@/features/signup/types'
import { getAllPlanConfigs, getPlanConfig } from '@/features/plan-config/queries'

interface SignupPageProps {
  searchParams: Promise<{ plan?: string }>
}

function isValidPlan(value: unknown): value is PlanType {
  // `in` はプロトタイプチェーン（constructor 等）までヒットするため hasOwn で判定する
  return typeof value === 'string' && Object.hasOwn(PLAN_CONFIG, value)
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  // 不明なプラン値（旧 'pro' 等）は free にフォールバックする
  const plan: PlanType = isValidPlan(params.plan) ? params.plan : 'free'
  const [config, allPlans] = await Promise.all([getPlanConfig(plan), getAllPlanConfigs()])
  const freeMaxEmployees =
    allPlans.find(p => p.planType === 'free')?.maxEmployees ?? PLAN_CONFIG.free.maxEmployees

  // 準備中プランは登録フォームを表示せず案内画面を出す
  if (!config.available) {
    return <PlanComingSoon plan={plan} config={config} freeMaxEmployees={freeMaxEmployees} />
  }

  return <SignupWizard initialPlan={plan} planConfig={config} />
}
