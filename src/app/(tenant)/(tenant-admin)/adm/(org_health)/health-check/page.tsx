import { HealthCheckAdminClient } from '@/features/health-check/components/HealthCheckAdminClient'
import {
  getCampaigns,
  getCsvPresets,
  getInstitutions,
  getItems,
  getManualFormItemIds,
} from '@/features/health-check/queries'
import { getEmployees } from '@/features/organization/queries'

export const metadata = { title: '健康診断管理（データ取込・CSV）' }

export default async function AdminHealthCheckImportPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>
}) {
  const { campaignId } = await searchParams
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
