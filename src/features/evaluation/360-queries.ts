import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Review360Campaign,
  Review360Question,
  CampaignDetail,
  SubjectWithReviewers,
  ReviewerWithStatus,
  FeedbackReportData,
  QuestionResult,
  PendingReviewItem,
  ReviewerType,
} from './360-types'

/** キャンペーン一覧取得 */
export async function get360Campaigns(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Review360Campaign[]> {
  const { data, error } = await (supabase as any)
    .from('review_360_campaigns')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[get360Campaigns] failed:', error.message)
    return []
  }
  return (data ?? []) as Review360Campaign[]
}

/** キャンペーン詳細（被評価者・評価者・設問を含む） */
export async function get360CampaignDetail(
  supabase: SupabaseClient,
  campaignId: string
): Promise<CampaignDetail | null> {
  const { data: campaign, error: cErr } = await (supabase as any)
    .from('review_360_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle()
  if (cErr || !campaign) return null

  const { data: questions } = await (supabase as any)
    .from('review_360_questions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('sort_order')
  const questionList = (questions ?? []) as Review360Question[]

  const { data: subjectRows } = await (supabase as any)
    .from('review_360_subjects')
    .select('*')
    .eq('campaign_id', campaignId)
  const subjectList = subjectRows ?? []

  if (subjectList.length === 0) {
    return { ...(campaign as Review360Campaign), subjects: [], questions: questionList }
  }

  const subjectIds = subjectList.map((s: any) => s.id)
  const employeeIds = subjectList.map((s: any) => s.employee_id)
  const totalQuestions = questionList.length

  const { data: empRows } = await (supabase as any)
    .from('employees')
    .select('id, name, divisions(name)')
    .in('id', employeeIds)
  const empMap = new Map<string, { name: string; department_name: string | null }>(
    (empRows ?? []).map((e: any) => {
      const div = Array.isArray(e.divisions) ? e.divisions[0] : e.divisions
      return [e.id as string, { name: e.name ?? '', department_name: (div?.name ?? null) as string | null }]
    })
  )

  const { data: reviewerRows } = await (supabase as any)
    .from('review_360_reviewers')
    .select('*')
    .in('subject_id', subjectIds)
  const allReviewers = reviewerRows ?? []

  const reviewerEmpIds = [...new Set(allReviewers.map((r: any) => r.reviewer_employee_id))]
  let reviewerEmpMap = new Map<string, { name: string; department_name: string | null }>()
  if (reviewerEmpIds.length > 0) {
    const { data: rEmpRows } = await (supabase as any)
      .from('employees')
      .select('id, name, divisions(name)')
      .in('id', reviewerEmpIds)
    reviewerEmpMap = new Map(
      (rEmpRows ?? []).map((e: any) => {
        const div = Array.isArray(e.divisions) ? e.divisions[0] : e.divisions
        return [e.id, { name: e.name ?? '', department_name: div?.name ?? null }]
      })
    )
  }

  const reviewerIds = allReviewers.map((r: any) => r.id)
  let respondedReviewerIds = new Set<string>()
  if (reviewerIds.length > 0 && totalQuestions > 0) {
    const { data: responseRows } = await (supabase as any)
      .from('review_360_responses')
      .select('reviewer_id')
      .in('reviewer_id', reviewerIds)
    const counts = new Map<string, number>()
    for (const row of responseRows ?? []) {
      counts.set(row.reviewer_id, (counts.get(row.reviewer_id) ?? 0) + 1)
    }
    respondedReviewerIds = new Set(
      [...counts.entries()].filter(([, c]) => c >= totalQuestions).map(([id]) => id)
    )
  }

  const reviewersBySubject = new Map<string, typeof allReviewers>()
  for (const r of allReviewers) {
    const list = reviewersBySubject.get(r.subject_id) ?? []
    list.push(r)
    reviewersBySubject.set(r.subject_id, list)
  }

  const subjects: SubjectWithReviewers[] = subjectList.map((s: any) => {
    const emp = empMap.get(s.employee_id) ?? { name: '', department_name: null }
    const revs = reviewersBySubject.get(s.id) ?? []
    const reviewers: ReviewerWithStatus[] = revs.map((r: any) => {
      const re = reviewerEmpMap.get(r.reviewer_employee_id) ?? { name: '', department_name: null }
      return { ...r, reviewer_name: re.name, department_name: re.department_name }
    })
    return {
      ...s,
      employee_name: emp.name,
      department_name: emp.department_name,
      reviewers,
      responded_count: revs.filter((r: any) => respondedReviewerIds.has(r.id)).length,
      total_count: revs.length,
    }
  })

  return {
    ...(campaign as Review360Campaign),
    subjects,
    questions: questionList,
  }
}

/** フィードバックレポート（被評価者別・集計済み） */
export async function get360FeedbackReport(
  supabase: SupabaseClient,
  subjectId: string
): Promise<FeedbackReportData | null> {
  const { data: subject } = await (supabase as any)
    .from('review_360_subjects')
    .select('*, review_360_campaigns(is_anonymous)')
    .eq('id', subjectId)
    .maybeSingle()
  if (!subject) return null

  const { data: emp } = await (supabase as any)
    .from('employees')
    .select('name, divisions(name)')
    .eq('id', subject.employee_id)
    .maybeSingle()
  const div = Array.isArray(emp?.divisions) ? emp.divisions[0] : emp?.divisions
  const employeeName = emp?.name ?? ''
  const departmentName = div?.name ?? null
  const isAnonymous = subject.review_360_campaigns?.is_anonymous ?? false

  const { data: reviewers } = await (supabase as any)
    .from('review_360_reviewers')
    .select('id, reviewer_type, is_anonymous, submitted_at')
    .eq('subject_id', subjectId)
  const reviewerList = reviewers ?? []
  const reviewerIds = reviewerList.map((r: any) => r.id)

  const { data: questions } = await (supabase as any)
    .from('review_360_questions')
    .select('*')
    .eq('campaign_id', subject.campaign_id)
    .order('sort_order')
  const questionList = (questions ?? []) as Review360Question[]

  if (reviewerIds.length === 0 || questionList.length === 0) {
    return {
      subject_id: subjectId,
      employee_name: employeeName,
      department_name: departmentName,
      question_results: [],
      strengths: [],
      improvements: [],
      total_reviewers: 0,
      responded_count: 0,
    }
  }

  const { data: responses } = await (supabase as any)
    .from('review_360_responses')
    .select('reviewer_id, question_id, score, comment')
    .in('reviewer_id', reviewerIds)
  const responseList = responses ?? []

  const reviewerTypeMap = new Map<string, ReviewerType>(reviewerList.map((r: any) => [r.id as string, r.reviewer_type as ReviewerType]))
  const reviewerAnonMap = new Map<string, boolean>(reviewerList.map((r: any) => [r.id as string, r.is_anonymous as boolean]))
  const respondedIds = new Set(
    reviewerList.filter((r: any) => r.submitted_at !== null).map((r: any) => r.id)
  )

  const question_results: QuestionResult[] = questionList.map(q => {
    const qResponses = responseList.filter((r: any) => r.question_id === q.id && r.score !== null)
    const scores = qResponses.map((r: any) => r.score as number)
    const avg_all = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0

    const byType: Partial<Record<ReviewerType, number[]>> = {}
    for (const r of qResponses) {
      const type = reviewerTypeMap.get(r.reviewer_id)
      if (!type) continue
      if (!byType[type]) byType[type] = []
      byType[type]!.push(r.score)
    }
    const avg_by_type: Partial<Record<ReviewerType, number>> = {}
    for (const [type, vals] of Object.entries(byType) as [ReviewerType, number[]][]) {
      avg_by_type[type] = vals.reduce((a, b) => a + b, 0) / vals.length
    }

    const comments = responseList
      .filter((r: any) => r.question_id === q.id && r.comment && r.comment.trim())
      .map((r: any) => {
        const anon = isAnonymous || reviewerAnonMap.get(r.reviewer_id)
        return anon ? `（匿名）${r.comment}` : r.comment
      })

    return {
      question_id: q.id,
      question_text: q.question_text,
      category: q.category,
      avg_all,
      avg_by_type,
      comments,
    }
  })

  const strengths = question_results.filter(q => q.avg_all >= 4.0)
  const improvements = question_results.filter(q => q.avg_all > 0 && q.avg_all <= 2.5)

  return {
    subject_id: subjectId,
    employee_name: employeeName,
    department_name: departmentName,
    question_results,
    strengths,
    improvements,
    total_reviewers: reviewerList.length,
    responded_count: respondedIds.size,
  }
}

/** 従業員が回答すべき360評価の一覧 */
export async function getMyPending360Reviews(
  supabase: SupabaseClient,
  employeeId: string
): Promise<PendingReviewItem[]> {
  const { data: reviewerRows } = await (supabase as any)
    .from('review_360_reviewers')
    .select('id, subject_id, is_anonymous, submitted_at, review_360_subjects(employee_id, campaign_id)')
    .eq('reviewer_employee_id', employeeId)
  const reviewerList = reviewerRows ?? []
  if (reviewerList.length === 0) return []

  const campaignIds = [...new Set(
    reviewerList.map((r: any) => r.review_360_subjects?.campaign_id).filter(Boolean)
  )]
  const subjectEmployeeIds = [...new Set(
    reviewerList.map((r: any) => r.review_360_subjects?.employee_id).filter(Boolean)
  )]

  const { data: campaigns } = await (supabase as any)
    .from('review_360_campaigns')
    .select('id, name, deadline, status')
    .in('id', campaignIds)
    .eq('status', 'open')
  const campaignMap = new Map<string, any>((campaigns ?? []).map((c: any) => [c.id as string, c]))

  const { data: subjectEmps } = await (supabase as any)
    .from('employees')
    .select('id, name')
    .in('id', subjectEmployeeIds)
  const empNameMap = new Map<string, string>((subjectEmps ?? []).map((e: any) => [e.id as string, e.name ?? '']))

  // 設問数をキャンペーンIDごとに一括取得
  const questionCountMap = new Map<string, number>()
  if (campaignIds.length > 0) {
    const { data: qRows } = await (supabase as any)
      .from('review_360_questions')
      .select('campaign_id')
      .in('campaign_id', campaignIds)
    for (const q of qRows ?? []) {
      questionCountMap.set(q.campaign_id, (questionCountMap.get(q.campaign_id) ?? 0) + 1)
    }
  }

  // 回答数を評価者IDごとに一括取得
  const answeredCountMap = new Map<string, number>()
  const allReviewerIds = reviewerList.map((r: any) => r.id)
  if (allReviewerIds.length > 0) {
    const { data: aRows } = await (supabase as any)
      .from('review_360_responses')
      .select('reviewer_id')
      .in('reviewer_id', allReviewerIds)
    for (const a of aRows ?? []) {
      answeredCountMap.set(a.reviewer_id, (answeredCountMap.get(a.reviewer_id) ?? 0) + 1)
    }
  }

  const result: PendingReviewItem[] = []
  for (const r of reviewerList) {
    const sub = r.review_360_subjects
    if (!sub) continue
    const campaign = campaignMap.get(sub.campaign_id)
    if (!campaign) continue

    result.push({
      reviewer_id: r.id,
      campaign_name: campaign.name,
      subject_name: empNameMap.get(sub.employee_id) ?? '',
      deadline: campaign.deadline,
      is_anonymous: r.is_anonymous,
      question_count: questionCountMap.get(sub.campaign_id) ?? 0,
      answered_count: answeredCountMap.get(r.id) ?? 0,
    })
  }
  return result
}

/** 従業員が回答フォームに表示するデータ（設問 + 既存回答） */
export async function get360ReviewerAnswers(
  supabase: SupabaseClient,
  reviewerId: string,
  employeeId: string
): Promise<{
  reviewer: any
  questions: Review360Question[]
  responses: Record<string, { score: number | null; comment: string }>
} | null> {
  const { data: reviewer } = await (supabase as any)
    .from('review_360_reviewers')
    .select('*, review_360_subjects(employee_id, campaign_id, review_360_campaigns(name, deadline, status, is_anonymous))')
    .eq('id', reviewerId)
    .eq('reviewer_employee_id', employeeId)
    .maybeSingle()
  if (!reviewer) return null

  const campaignId = reviewer.review_360_subjects?.campaign_id
  if (!campaignId) return null

  const { data: questions } = await (supabase as any)
    .from('review_360_questions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('sort_order')

  const { data: existing } = await (supabase as any)
    .from('review_360_responses')
    .select('question_id, score, comment')
    .eq('reviewer_id', reviewerId)

  const responses: Record<string, { score: number | null; comment: string }> = {}
  for (const r of existing ?? []) {
    responses[r.question_id] = { score: r.score, comment: r.comment ?? '' }
  }

  return {
    reviewer,
    questions: (questions ?? []) as Review360Question[],
    responses,
  }
}
