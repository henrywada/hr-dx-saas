import { getTenantPulses } from '@/features/candidate-pulse/queries'
import TenantBackLink from '@/components/common/TenantBackLink'
import { PulseDashboardUI } from './PulseDashboardUI'

export const metadata = {
  title: '候補者パルスサーベイ',
}

export default async function PulseDashboardPage() {
  const pulses = await getTenantPulses()

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">候補者パルスサーベイ</h1>
        <TenantBackLink className="self-start shrink-0" />
      </div>
      <PulseDashboardUI initialPulses={pulses} />
    </div>
  )
}
