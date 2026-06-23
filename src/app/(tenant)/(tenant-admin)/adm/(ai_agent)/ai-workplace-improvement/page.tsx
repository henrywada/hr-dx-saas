import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getImprovementPlans } from '@/features/adm/ai-workplace-improvement/queries'
import { getDistinctDivisionLayers } from '@/features/adm/stress-check/queries'
import AIWorkplaceImprovementClient from './components/AIWorkplaceImprovementClient'

/**
 * AI職場改善提案エージェント — メインページ
 *
 * 第8章準拠｜集団分析結果をAIが読み、具体的な職場改善提案を生成。
 * 即実行登録 → 3ヶ月後自動フォロー測定。
 */
export default async function AIWorkplaceImprovementPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [plans, availableLayers] = await Promise.all([
    getImprovementPlans(user.tenant_id),
    getDistinctDivisionLayers(user.tenant_id),
  ])

  return (
    <AIWorkplaceImprovementClient
      tenantId={user.tenant_id}
      initialPlans={plans}
      availableLayers={availableLayers}
    />
  )
}
