import { getServerUser } from '@/lib/auth/server-user'
import { getPulseSurveyPeriodKey } from '@/lib/datetime'
import { getTenantPulseSurveyCadence } from '@/features/dashboard/queries'
import SurveyAnswerClient from './SurveyAnswerClient'

export default async function SurveyAnswerPage() {
  const user = await getServerUser()
  let defaultSurveyPeriod = getPulseSurveyPeriodKey('monthly')

  if (user?.tenant_id) {
    const cadence = await getTenantPulseSurveyCadence(user.tenant_id)
    defaultSurveyPeriod = getPulseSurveyPeriodKey(cadence)
  }

  return <SurveyAnswerClient defaultSurveyPeriod={defaultSurveyPeriod} />
}
