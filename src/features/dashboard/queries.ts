import { createClient } from '@/lib/supabase/server'
import {
  getPulseSurveyPeriodKey,
  normalizePulseSurveyCadence,
  pulseSurveyPeriodDeadlineFallbackYmd,
  toJSTDateString,
  type PulseSurveyCadence,
} from '@/lib/datetime'
import { getAssignedQuestionnaires } from '@/features/questionnaire/queries'
import type { AssignedQuestionnaire } from '@/features/questionnaire/types'
import { ImportantTask, Announcement, AnnouncementRow, PulseSurveyPeriodRow } from './types'

// announcements / pulse_survey_periods 等は型定義に含まれない場合があるため any でラップ
async function getSupabase() {
  return (await createClient()) as any
}

// 従業員専用トップ画面向けのクエリ群
// - tenant_id / user_id は RLS + current_tenant_id() に委ねつつ、必要なものだけ明示的に指定

const ANNOUNCEMENT_LIMIT = 4

export async function getTopAnnouncements(): Promise<Announcement[]> {
  const supabase = await getSupabase()

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, published_at, is_new, target_audience')
    .order('published_at', { ascending: false })
    .limit(ANNOUNCEMENT_LIMIT)

  if (error || !data) return []

  return data.map(row => {
    const d = row.published_at ? new Date(row.published_at) : null
    const dateLabel = d
      ? `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d
          .getDate()
          .toString()
          .padStart(2, '0')}`
      : ''

    return {
      id: row.id as string,
      title: row.title as string,
      body: (row.body as string | null) ?? null,
      targetAudience: (row.target_audience as string | null) ?? null,
      dateLabel,
      isNew: !!row.is_new,
    }
  })
}

type PulsePeriodRow = {
  id: string
  survey_period: string
  title: string
  description: string | null
  deadline_date: string
  link_path: string | null
}

/** DB に当月行がなくても表示するデフォルト（管理画面のプレースホルダと揃える） */
const DEFAULT_PULSE_TITLE = '今月の組織度アンケート（Echo）'
const DEFAULT_PULSE_DESCRIPTION =
  '組織のコンディションを把握するための重要なアンケートです。回答時間は約5分です。'

export async function getTenantPulseSurveyCadence(tenantId: string): Promise<PulseSurveyCadence> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('tenants')
    .select('pulse_survey_cadence')
    .eq('id', tenantId)
    .maybeSingle()
  if (error) return 'monthly'
  return normalizePulseSurveyCadence(data?.pulse_survey_cadence as string | undefined)
}

export async function getEmployeeImportantTask(
  userId: string | null,
  tenantId?: string | null
): Promise<ImportantTask | null> {
  if (!userId) return null

  const supabase = await getSupabase()

  let cadence: PulseSurveyCadence = 'monthly'
  if (tenantId) {
    cadence = await getTenantPulseSurveyCadence(tenantId)
  }

  // 期間キー: 月次は JST の YYYY-MM、週次は ISO 週 YYYY-Www
  const periodKey = getPulseSurveyPeriodKey(cadence)
  const todayJstYmd = toJSTDateString()

  let echoActiveTitle: string | null = null
  if (tenantId) {
    const { data: echoRow } = await supabase
      .from('questionnaires')
      .select('title')
      .eq('tenant_id', tenantId)
      .eq('creator_type', 'tenant')
      .eq('purpose', 'echo')
      .eq('status', 'active')
      .maybeSingle()
    echoActiveTitle = (echoRow?.title as string | undefined) ?? null
  }

  const { data: period, error } = await supabase
    .from('pulse_survey_periods')
    .select('*')
    .eq('survey_period', periodKey)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) return null

  const surveyPeriod = period?.survey_period ?? periodKey
  const deadlineYmd = period?.deadline_date
    ? String(period.deadline_date).slice(0, 10)
    : pulseSurveyPeriodDeadlineFallbackYmd(periodKey, cadence)

  // 期限は日付のみで比較（締切日当日は含む。時刻による誤判定を防ぐ）
  if (todayJstYmd > deadlineYmd) {
    return null
  }

  const { data: responses, error: respError } = await supabase
    .from('pulse_survey_responses')
    .select('id')
    .eq('user_id', userId)
    .eq('survey_period', surveyPeriod)
    .limit(1)

  if (respError) return null
  const alreadyAnswered = !!responses && responses.length > 0

  const [, dm, dd] = deadlineYmd.split('-').map(Number)
  const deadlineLabel =
    Number.isFinite(dm) && Number.isFinite(dd)
      ? `${dm}月${dd}日まで`
      : cadence === 'weekly'
        ? '今週中'
        : '今月中'

  const title = echoActiveTitle ?? period?.title ?? DEFAULT_PULSE_TITLE
  const description = period?.description ?? DEFAULT_PULSE_DESCRIPTION
  const linkPath =
    period?.link_path ?? `/survey/answer?period=${encodeURIComponent(surveyPeriod)}`

  return {
    title,
    description,
    deadlineLabel,
    linkPath,
    isPending: !alreadyAnswered,
  }
}

/** トップ「人事からのお知らせ」内の未回答アンケート CTA 用。失敗時は空配列。 */
export async function getPendingAssignedQuestionnairesForTop(
  employeeId: string | null | undefined
): Promise<AssignedQuestionnaire[]> {
  if (!employeeId) return []
  try {
    const all = await getAssignedQuestionnaires(employeeId)
    const today = toJSTDateString()
    return all.filter(q => {
      if (q.submitted_at) return false
      // 実施は「公開」ではなく期間＋アサインで運用するため draft も含め、終了のみ除外
      if (q.questionnaire_status === 'closed') return false
      // 期間がある場合は開始日〜終了日の範囲内のみ表示（暦日は JST）
      if (q.period_start_date && today < q.period_start_date) return false
      if (q.period_end_date && today > q.period_end_date) return false
      return true
    })
  } catch {
    return []
  }
}

// ========== 管理画面用クエリ ==========

/** テナント内の全お知らせを取得（管理画面用） */
export async function getAnnouncementsForAdmin(): Promise<AnnouncementRow[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('published_at', { ascending: false })

  if (error || !data) return []
  return data as AnnouncementRow[]
}

/** テナント内の全パルス調査期間を取得（管理画面用） */
export async function getPulseSurveyPeriodsForAdmin(): Promise<PulseSurveyPeriodRow[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('pulse_survey_periods')
    .select('*')
    .order('survey_period', { ascending: false })

  if (error || !data) return []
  return data as PulseSurveyPeriodRow[]
}

