'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import type {
  CampaignFormInput,
  QuestionInput,
  ReviewerInput,
  ResponseInput,
  ReviewCampaignStatus,
  ActionResult,
} from './360-types'

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

async function authorizeHr() {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')
  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) throw new Error('Forbidden')
  return user
}

/** キャンペーンを新規作成する */
export async function createCampaign(input: CampaignFormInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const empRes = await (supabase as any)
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    const { error } = await (supabase as any).from('review_360_campaigns').insert({
      tenant_id: user.tenant_id,
      name: input.name.trim(),
      description: input.description.trim() || null,
      period_id: input.period_id || null,
      deadline: input.deadline,
      is_anonymous: input.is_anonymous,
      created_by: empRes.data?.id ?? null,
    })
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** キャンペーンを更新する */
export async function updateCampaign(id: string, input: CampaignFormInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('review_360_campaigns')
      .update({
        name: input.name.trim(),
        description: input.description.trim() || null,
        period_id: input.period_id || null,
        deadline: input.deadline,
        is_anonymous: input.is_anonymous,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** キャンペーンのステータスを変更する */
export async function setCampaignStatus(
  id: string,
  status: ReviewCampaignStatus
): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('review_360_campaigns')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 被評価者を追加する */
export async function addSubject(campaignId: string, employeeId: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const { error } = await (supabase as any).from('review_360_subjects').insert({
      campaign_id: campaignId,
      tenant_id: user.tenant_id,
      employee_id: employeeId,
    })
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 被評価者を削除する（CASCADE で評価者・回答も消える） */
export async function removeSubject(subjectId: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('review_360_subjects')
      .delete()
      .eq('id', subjectId)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 評価者を追加する */
export async function addReviewer(subjectId: string, input: ReviewerInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const { error } = await (supabase as any).from('review_360_reviewers').insert({
      subject_id: subjectId,
      tenant_id: user.tenant_id,
      reviewer_employee_id: input.reviewer_employee_id,
      reviewer_type: input.reviewer_type,
      is_anonymous: input.is_anonymous,
    })
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 評価者を削除する */
export async function removeReviewer(reviewerId: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('review_360_reviewers')
      .delete()
      .eq('id', reviewerId)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/adm/evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 設問を一括保存する（既存削除→再INSERT、draft のみ許可） */
export async function saveQuestions(
  campaignId: string,
  questions: QuestionInput[]
): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { data: campaign } = await (supabase as any)
      .from('review_360_campaigns')
      .select('status')
      .eq('id', campaignId)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle()
    if (!campaign) return { success: false, error: 'キャンペーンが見つかりません' }
    if (campaign.status !== 'draft') {
      return { success: false, error: '公開済みキャンペーンの設問は変更できません' }
    }

    const { error: delErr } = await (supabase as any)
      .from('review_360_questions')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('tenant_id', user.tenant_id)
    if (delErr) return { success: false, error: delErr.message }

    if (questions.length === 0) {
      revalidatePath('/adm/evaluation-360')
      return { success: true }
    }

    const rows = questions.map((q, i) => ({
      campaign_id: campaignId,
      tenant_id: user.tenant_id,
      question_text: q.question_text.trim(),
      category: q.category,
      sort_order: i,
    }))
    const { error: insErr } = await (supabase as any).from('review_360_questions').insert(rows)
    if (insErr) return { success: false, error: insErr.message }

    revalidatePath('/adm/evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 従業員が360評価に回答・更新する */
export async function submitReview(
  reviewerId: string,
  responses: ResponseInput[]
): Promise<ActionResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) throw new Error('Unauthorized')
    const supabase = await createClient()

    const empRes = await (supabase as any)
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    const employeeId = empRes.data?.id
    if (!employeeId) return { success: false, error: '従業員情報が見つかりません' }

    // 自分が reviewer であることを確認
    const { data: reviewer } = await (supabase as any)
      .from('review_360_reviewers')
      .select('id')
      .eq('id', reviewerId)
      .eq('reviewer_employee_id', employeeId)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle()
    if (!reviewer) return { success: false, error: '評価依頼が見つかりません' }

    for (const resp of responses) {
      const { data: existing } = await (supabase as any)
        .from('review_360_responses')
        .select('id')
        .eq('reviewer_id', reviewerId)
        .eq('question_id', resp.question_id)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle()

      const payload = {
        reviewer_id: reviewerId,
        question_id: resp.question_id,
        tenant_id: user.tenant_id,
        score: resp.score,
        comment: resp.comment.trim() || null,
      }

      const { error } = existing
        ? await (supabase as any)
            .from('review_360_responses')
            .update(payload)
            .eq('id', existing.id)
            .eq('tenant_id', user.tenant_id)
        : await (supabase as any).from('review_360_responses').insert(payload)
      if (error) return { success: false, error: error.message }
    }

    await (supabase as any)
      .from('review_360_reviewers')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', reviewerId)
      .eq('tenant_id', user.tenant_id)

    revalidatePath('/my-evaluation-360')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}
