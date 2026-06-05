import { redirect, notFound } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { get360ReviewerAnswers } from '@/features/evaluation/360-queries'
import { ReviewAnswerForm } from '@/features/evaluation/components/360/ReviewAnswerForm'

export const metadata = { title: '360度評価 回答' }

interface Props {
  params: Promise<{ reviewerId: string }>
}

export default async function My360AnswerPage({ params }: Props) {
  const { reviewerId } = await params
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!emp) redirect(APP_ROUTES.TENANT.PORTAL)

  const data = await get360ReviewerAnswers(supabase as any, reviewerId, emp.id)
  if (!data) notFound()

  const campaign = data.reviewer.review_360_subjects?.review_360_campaigns
  if (!campaign || campaign.status !== 'open') {
    redirect(APP_ROUTES.EVALUATION.MY_EVALUATION_360)
  }

  const subjectEmpId = data.reviewer.review_360_subjects?.employee_id
  const { data: subjectEmp } = await supabase
    .from('employees')
    .select('name')
    .eq('id', subjectEmpId)
    .maybeSingle()

  return (
    <ReviewAnswerForm
      reviewerId={reviewerId}
      campaignName={campaign.name}
      subjectName={subjectEmp?.name ?? ''}
      deadline={campaign.deadline}
      isAnonymous={campaign.is_anonymous || data.reviewer.is_anonymous}
      questions={data.questions}
      initialResponses={data.responses}
      isSubmitted={!!data.reviewer.submitted_at}
    />
  )
}
