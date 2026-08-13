import { HealthCheckAdminClient } from '@/features/health-check/components/HealthCheckAdminClient'
import {
  getCampaigns,
  getHrRecordRows,
  getMaxDivisionLayer,
  getNotReceivedEmployees,
  getOrgAnalysis,
  getParticipationStats,
} from '@/features/health-check/queries'
import type { OrgLayer } from '@/features/health-check/types'

export const metadata = { title: '健康診断管理（受診率・組織分析）' }

function pickLatestOpen(campaigns: { id: string; status: string }[]) {
  return campaigns.find(c => c.status === 'open') ?? campaigns[0] ?? null
}

export default async function AdminHealthCheckAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string; orgCampaignId?: string; layer?: string }>
}) {
  const { campaignId, orgCampaignId, layer } = await searchParams
  const orgLayer: OrgLayer = layer === '1' || layer === '2' || layer === '3' ? layer : 'all'
  const [campaigns, maxOrgLayer] = await Promise.all([getCampaigns(), getMaxDivisionLayer()])
  const selected = campaigns.find(c => c.id === campaignId) ?? campaigns[0] ?? null
  const orgCampaign = campaigns.find(c => c.id === orgCampaignId) ?? pickLatestOpen(campaigns)

  const [stats, records, notReceived, orgRows] = selected
    ? await Promise.all([
        getParticipationStats(selected.id),
        getHrRecordRows(selected.id),
        getNotReceivedEmployees(selected.id),
        orgCampaign ? getOrgAnalysis(orgCampaign.id, orgLayer) : Promise.resolve([]),
      ])
    : [null, [], [], []]

  return (
    <HealthCheckAdminClient
      view="analysis"
      campaigns={campaigns}
      selectedCampaign={selected}
      institutions={[]}
      presets={[]}
      items={[]}
      stats={stats}
      records={records}
      notReceived={notReceived}
      orgRows={orgRows}
      orgLayer={orgLayer}
      orgCampaignId={orgCampaign?.id ?? null}
      maxOrgLayer={maxOrgLayer}
      employees={[]}
      manualItemIds={[]}
    />
  )
}
