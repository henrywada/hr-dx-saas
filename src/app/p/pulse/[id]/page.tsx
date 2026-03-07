import { notFound } from 'next/navigation'
import { getPulseByToken } from '@/features/candidate-pulse/queries'
import { PulseFormUI } from './PulseFormUI'

export default async function CandidatePulsePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pulse = await getPulseByToken(id)

  if (!pulse) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden mt-8">
        <PulseFormUI pulse={pulse} />
      </div>
    </div>
  )
}
