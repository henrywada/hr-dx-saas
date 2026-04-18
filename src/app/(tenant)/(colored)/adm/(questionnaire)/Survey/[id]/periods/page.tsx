import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getQuestionnaireDetail, getQuestionnairePeriods } from '@/features/questionnaire/queries'
import PeriodListPanel from '@/features/questionnaire/components/PeriodListPanel'

export const dynamic = 'force-dynamic'

export default async function SurveyPeriodsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const [questionnaire, periods] = await Promise.all([
    getQuestionnaireDetail(id),
    getQuestionnairePeriods(id),
  ])

  if (!questionnaire) redirect(APP_ROUTES.TENANT.ADMIN_SURVEY)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PeriodListPanel
        questionnaire={questionnaire}
        initialPeriods={periods}
        tenantId={user.tenant_id}
      />
    </div>
  )
}
