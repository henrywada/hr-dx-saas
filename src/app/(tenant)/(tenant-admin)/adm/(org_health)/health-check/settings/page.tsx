import { HealthCheckAdminClient } from '@/features/health-check/components/HealthCheckAdminClient'
import {
  getCampaigns,
  getCsvPresets,
  getInstitutionColumnMaps,
  getInstitutions,
  getItemThresholds,
  getItems,
  getJudgmentCodeMaps,
  getJudgmentCodes,
  getManualFormItemIds,
  getUnitConversions,
} from '@/features/health-check/queries'

export const metadata = { title: '健康診断管理（設定）' }

export default async function AdminHealthCheckSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string; tab?: string }>
}) {
  const { campaignId, tab } = await searchParams
  const [
    campaigns,
    institutions,
    presets,
    items,
    manualItemIds,
    columnMaps,
    judgmentCodes,
    judgmentCodeMaps,
    unitConversions,
    itemThresholds,
  ] = await Promise.all([
    getCampaigns(),
    getInstitutions(),
    getCsvPresets(),
    getItems(),
    getManualFormItemIds(),
    getInstitutionColumnMaps(),
    getJudgmentCodes(),
    getJudgmentCodeMaps(),
    getUnitConversions(),
    getItemThresholds(),
  ])
  const selected = campaigns.find(c => c.id === campaignId) ?? campaigns[0] ?? null

  return (
    <HealthCheckAdminClient
      view="settings"
      tab={tab === 'conversion' ? 'conversion' : 'general'}
      campaigns={campaigns}
      selectedCampaign={selected}
      institutions={institutions}
      presets={presets}
      items={items}
      stats={null}
      records={[]}
      notReceived={[]}
      orgRows={[]}
      orgLayer="all"
      employees={[]}
      manualItemIds={manualItemIds}
      columnMaps={columnMaps}
      judgmentCodes={judgmentCodes}
      judgmentCodeMaps={judgmentCodeMaps}
      unitConversions={unitConversions}
      itemThresholds={itemThresholds}
    />
  )
}
