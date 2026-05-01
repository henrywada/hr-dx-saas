import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getDistinctDivisionLayers,
  getGroupAnalysis,
  getGroupAnalysisEstablishment,
  getGroupAnalysisForLayer,
  getGroupTrend,
  getGroupTrendEstablishment,
  getGroupTrendForLayer,
} from '@/features/adm/stress-check/queries'
import GroupAnalysisContent from '@/features/adm/stress-check/components/GroupAnalysisContent'
import type { GroupAnalysisMode } from '@/features/adm/stress-check/components/GroupAnalysisToolbar'

type SearchParams = { mode?: string; layer?: string }

export default async function GroupAnalysisPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const sp = (await searchParams) ?? {}
  const rawMode = sp.mode
  const layers = await getDistinctDivisionLayers(user.tenant_id)

  let mode: GroupAnalysisMode =
    rawMode === 'establishment'
      ? 'establishment'
      : rawMode === 'layer'
        ? 'layer'
        : 'division'

  let layer: number | null = null
  if (mode === 'layer') {
    const parsed = sp.layer != null ? parseInt(String(sp.layer), 10) : NaN
    if (!Number.isFinite(parsed) || !layers.includes(parsed)) {
      layer = layers[0] ?? null
      if (layer == null) {
        mode = 'division'
      }
    } else {
      layer = parsed
    }
  }

  let groups
  let trendData
  if (mode === 'establishment') {
    ;[groups, trendData] = await Promise.all([
      getGroupAnalysisEstablishment(user.tenant_id),
      getGroupTrendEstablishment(user.tenant_id),
    ])
  } else if (mode === 'layer' && layer != null) {
    ;[groups, trendData] = await Promise.all([
      getGroupAnalysisForLayer(user.tenant_id, layer),
      getGroupTrendForLayer(user.tenant_id, layer),
    ])
  } else {
    ;[groups, trendData] = await Promise.all([
      getGroupAnalysis(user.tenant_id),
      getGroupTrend(user.tenant_id),
    ])
    mode = 'division'
  }

  return (
    <GroupAnalysisContent
      groups={groups}
      trendData={trendData}
      mode={mode}
      layer={layer}
      layers={layers}
    />
  )
}
