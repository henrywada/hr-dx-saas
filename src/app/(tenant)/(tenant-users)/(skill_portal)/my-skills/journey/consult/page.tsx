import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getConsultationHistory } from '@/features/skill-portal/queries'
import { ConsultationForm } from '@/features/skill-portal/components/ConsultationForm'

export default async function ConsultPage() {
  const user = await getServerUser()
  if (!user?.employee_id) return notFound()

  const supabase = await createClient()
  const history = await getConsultationHistory(supabase, user.employee_id)

  return <ConsultationForm history={history} />
}
