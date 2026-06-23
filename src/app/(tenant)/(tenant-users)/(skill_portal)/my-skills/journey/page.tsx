import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getGrowthJourneyData } from '@/features/skill-portal/queries'
import { GrowthJourneyBoard } from '@/features/skill-portal/components/GrowthJourneyBoard'

export default async function EmployeeJourneyPage() {
  const user = await getServerUser()
  if (!user?.employee_id) return notFound()

  const supabase = await createClient()
  const data = await getGrowthJourneyData(supabase, user.employee_id)

  return <GrowthJourneyBoard data={data} isManager={false} />
}
