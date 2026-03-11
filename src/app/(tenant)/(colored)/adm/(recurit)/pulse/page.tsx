import { getTenantPulses } from '@/features/candidate-pulse/queries'
import { PulseDashboardUI } from './PulseDashboardUI'

export const metadata = {
  title: '候補者パルスサーベイ',
}

export default async function PulseDashboardPage() {
  const pulses = await getTenantPulses()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">候補者パルスサーベイ</h1>
      <PulseDashboardUI initialPulses={pulses} />
    </div>
  )
}
