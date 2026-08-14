import { HealthCheckAdminClient } from '@/features/health-check/components/HealthCheckAdminClient'
import {
  getCampaigns,
  getCsvPresets,
  getInstitutions,
  getItems,
  getManualFormItemIds,
} from '@/features/health-check/queries'
import { getEmployees } from '@/features/organization/queries'

export const metadata = { title: '健康診断管理（健診結果取込）' }

export default async function AdminHealthCheckImportPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string; tab?: string }>
}) {
  const { campaignId, tab } = await searchParams
  const [campaigns, institutions, presets, items, employees, manualItemIds] = await Promise.all([
    getCampaigns(),
    getInstitutions(),
    getCsvPresets(),
    getItems(),
    getEmployees(),
    getManualFormItemIds(),
  ])
  const selected = campaigns.find(c => c.id === campaignId) ?? campaigns[0] ?? null

  return (
    <HealthCheckAdminClient
      view="import"
      tab={tab === 'manual' ? 'manual' : 'csv'}
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
      employees={(employees ?? []).map(
        (e: { id: string; name: string; employee_no: string | null }) => ({
          id: e.id,
          name: e.name,
          employee_no: e.employee_no,
        })
      )}
      manualItemIds={manualItemIds}
    />
  )
}
