import { HealthCheckAdminClient } from '@/features/health-check/components/HealthCheckAdminClient'
import {
  getCampaigns,
  getCsvPresets,
  getInstitutionColumnMaps,
  getInstitutions,
  getItems,
  getManualFormItemIds,
} from '@/features/health-check/queries'

export const metadata = { title: '健康診断管理（設定）' }

export default async function AdminHealthCheckSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>
}) {
  const { campaignId } = await searchParams
  const [campaigns, institutions, presets, items, manualItemIds, columnMaps] = await Promise.all([
    getCampaigns(),
    getInstitutions(),
    getCsvPresets(),
    getItems(),
    getManualFormItemIds(),
    getInstitutionColumnMaps(),
  ])
  const selected = campaigns.find(c => c.id === campaignId) ?? campaigns[0] ?? null

  return (
    <HealthCheckAdminClient
      view="settings"
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
    />
  )
}
