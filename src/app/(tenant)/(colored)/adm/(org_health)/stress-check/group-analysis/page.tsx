import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getDistinctDivisionLayers,
  getGroupAnalysis,
  getGroupAnalysisCompanyWide,
  getGroupAnalysisEstablishment,
  getGroupAnalysisForLayer,
  getGroupTrend,
  getGroupTrendCompanyWide,
  getGroupTrendEstablishment,
  getGroupTrendForLayer,
  getDivisionsFlat,
  buildFullPath,
} from '@/features/adm/stress-check/queries'
import LayerHeatmapContent from '@/features/adm/stress-check/components/LayerHeatmapContent'
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
        : rawMode === 'division'
          ? 'division'
          : 'all' // デフォルト: 全社集計

  let layer: number | null = null
  if (mode === 'layer') {
    const parsed = sp.layer != null ? parseInt(String(sp.layer), 10) : NaN
    if (!Number.isFinite(parsed) || !layers.includes(parsed)) {
      layer = layers[0] ?? null
      if (layer == null) {
        mode = 'all'
      }
    } else {
      layer = parsed
    }
  }

  let groups
  let trendData
  if (mode === 'all') {
    ;[groups, trendData] = await Promise.all([
      getGroupAnalysisCompanyWide(user.tenant_id),
      getGroupTrendCompanyWide(user.tenant_id),
    ])
  } else if (mode === 'establishment') {
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
  }

  // 部署名をフルパス（上位層 / 中間層 / 末端層）に変換し、code でソート順を付与
  const allDivisions = await getDivisionsFlat(user.tenant_id)
  const groupsWithPaths = groups.map(g => {
    const fullPath = buildFullPath(g.division_id, allDivisions)
    const divInfo = allDivisions.find(d => d.id === g.division_id)
    return { ...g, name: fullPath || g.name, code: divInfo?.code ?? null }
  })

  return (
    <LayerHeatmapContent
      groups={groupsWithPaths}
      trendData={trendData}
      mode={mode}
      layer={layer}
      layers={layers}
    />
  )
}
