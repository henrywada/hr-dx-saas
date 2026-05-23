import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { verifyManagerAccess, getGrowthJourneyData } from '@/features/skill-portal/queries'
import { GrowthJourneyBoard } from '@/features/skill-portal/components/GrowthJourneyBoard'

interface Props {
  params: Promise<{ employeeId: string }>
}

export default async function ManagerJourneyPage({ params }: Props) {
  const { employeeId } = await params
  const user = await getServerUser()
  if (!user?.employee_id) return notFound()

  const supabase = await createClient()

  const hasAccess = await verifyManagerAccess(supabase, user.employee_id, employeeId)
  if (!hasAccess) return notFound()

  const data = await getGrowthJourneyData(supabase, employeeId)

  return <GrowthJourneyBoard data={data} isManager={true} />
}
