import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { getPulseSurveyPeriodKey, normalizePulseSurveyCadence } from '@/lib/datetime'
import SurveyAnswerClient from './SurveyAnswerClient'

export default async function SurveyAnswerPage() {
  const user = await getServerUser()
  let defaultSurveyPeriod = getPulseSurveyPeriodKey('monthly')

  if (user?.tenant_id) {
    const supabase = (await createClient()) as any
    const { data, error } = await supabase
      .from('tenants')
      .select('pulse_survey_cadence')
      .eq('id', user.tenant_id)
      .maybeSingle()
    if (!error) {
      const cadence = normalizePulseSurveyCadence(data?.pulse_survey_cadence)
      defaultSurveyPeriod = getPulseSurveyPeriodKey(cadence)
    }
  }

  return <SurveyAnswerClient defaultSurveyPeriod={defaultSurveyPeriod} />
}
