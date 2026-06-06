'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type {
  CreateNominationInput,
  UpdateNominationStatusInput,
  UpdateRewardStatusInput,
  UpsertReferralPostingInput,
} from './types'

/** 従業員：知人を推薦する */
export async function createNomination(
  input: CreateNominationInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('referral_nominations').insert({
    tenant_id: user.tenant_id,
    referral_posting_id: input.referral_posting_id,
    referrer_employee_id: user.employee_id,
    nominee_name: input.nominee_name,
    nominee_email: input.nominee_email ?? null,
    nominee_phone: input.nominee_phone ?? null,
    relationship: input.relationship ?? null,
    nomination_reason: input.nomination_reason ?? null,
    status: 'pending',
  })

  if (error) {
    console.error('createNomination error:', error)
    return { success: false, error: '推薦の登録に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.TENANT.REFERRAL_FORM)
  revalidatePath(APP_ROUTES.TENANT.REFERRAL_MY)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_REFERRAL)
  return { success: true }
}

/**
 * 人事：推薦ステータスを更新する
 * status が 'hired' になった場合は referral_rewards を自動 INSERT する
 */
export async function updateNominationStatus(
  nominationId: string,
  input: UpdateNominationStatusInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()

  const updateData: Record<string, unknown> = { status: input.status }
  if (input.hr_notes !== undefined) updateData.hr_notes = input.hr_notes
  if (input.hired_at) updateData.hired_at = input.hired_at

  const { data: nomination, error: updateError } = await supabase
    .from('referral_nominations')
    .update(updateData)
    .eq('id', nominationId)
    .eq('tenant_id', user.tenant_id)
    .select('id, tenant_id, referrer_employee_id, referral_posting_id')
    .single()

  if (updateError) {
    console.error('updateNominationStatus error:', updateError)
    return { success: false, error: 'ステータスの更新に失敗しました。' }
  }

  // 入社確定時に報奨金レコードを自動生成する
  if (input.status === 'hired' && nomination) {
    const { data: posting } = await supabase
      .from('referral_postings')
      .select('reward_amount')
      .eq('id', nomination.referral_posting_id)
      .single()

    if (posting && posting.reward_amount > 0) {
      const { error: rewardError } = await supabase.from('referral_rewards').insert({
        tenant_id: nomination.tenant_id,
        nomination_id: nominationId,
        referrer_employee_id: nomination.referrer_employee_id,
        amount: posting.reward_amount,
        status: 'pending',
      })
      if (rewardError) {
        console.error('auto-create reward error:', rewardError)
      }
    }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_REFERRAL)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_REFERRAL_DETAIL(nominationId))
  revalidatePath(APP_ROUTES.TENANT.ADMIN_REFERRAL_REWARDS)
  return { success: true }
}

/** 人事：リファラル求人を作成する */
export async function createReferralPosting(
  input: UpsertReferralPostingInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('referral_postings')
    .insert({
      tenant_id: user.tenant_id,
      created_by: user.employee_id,
      ...input,
    })
    .select('id')
    .single()

  if (error) {
    console.error('createReferralPosting error:', error)
    return { success: false, error: 'リファラル求人の作成に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_REFERRAL_POSTINGS)
  return { success: true, id: data.id }
}

/** 人事：リファラル求人を更新する */
export async function updateReferralPosting(
  postingId: string,
  input: Partial<UpsertReferralPostingInput>
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('referral_postings')
    .update(input)
    .eq('id', postingId)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('updateReferralPosting error:', error)
    return { success: false, error: 'リファラル求人の更新に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_REFERRAL_POSTINGS)
  return { success: true }
}

/** 人事：報奨金ステータスを更新する（承認・支払い完了など） */
export async function updateRewardStatus(
  rewardId: string,
  input: UpdateRewardStatusInput
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()

  const updateData: Record<string, unknown> = { status: input.status }
  if (input.scheduled_date) updateData.scheduled_date = input.scheduled_date
  if (input.paid_at) updateData.paid_at = input.paid_at
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.status === 'approved') updateData.approved_by = user.employee_id

  const { error } = await supabase
    .from('referral_rewards')
    .update(updateData)
    .eq('id', rewardId)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('updateRewardStatus error:', error)
    return { success: false, error: '報奨金ステータスの更新に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_REFERRAL_REWARDS)
  return { success: true }
}
