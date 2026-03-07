'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPulseEmail, sendRiskAlertEmail } from '@/lib/mail'
import { getServerUser } from '@/lib/auth/server-user'

export const submitPulseAnswer = async (id: string, formData: {
  sentiment_score: number
  concerns: string[]
  comment: string
}) => {
  if (formData.sentiment_score < 1 || formData.sentiment_score > 5) {
    throw new Error('スコアは1〜5の間で入力してください。')
  }

  // 候補者は未認証であるため、service_role キーを用いて RLS をバイパスして保存する
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('candidate_pulses')
    .update({
      sentiment_score: formData.sentiment_score,
      concerns: formData.concerns,
      comment: formData.comment,
      is_answered: true,
    })
    .eq('id', id)
    .eq('is_answered', false) // 重複回答を防ぐため、未回答のものだけ更新する
    .select()
    .single()

  if (error || !data) {
    console.error('submitPulseAnswer error:', error)
    throw new Error('回答の保存に失敗しました。')
  }

  // アラート判定: スコア3以下 または 懸念点1つ以上
  const isHighRisk = formData.sentiment_score <= 3 || formData.concerns.length > 0

  if (isHighRisk) {
    // 送信先メールアドレス（環境変数があれば優先、なければダミーの管理者アドレス）
    // 本来は tenant_id に紐づく users/employees から担当者アドレスを引くのが理想です。
    const alertEmail = process.env.HR_ALERT_EMAIL_DEFAULT || 'admin@example.com'
    
    // メール送信を非同期で行う（awaitでブロックせず、バックグラウンド実行を許容する）
    sendRiskAlertEmail(
      alertEmail, 
      data.candidate_name, 
      formData.sentiment_score, 
      formData.concerns, 
      formData.comment
    ).catch(e => console.error('Alert email failed:', e))
  }

  // Next.jsのキャッシュをクリア
  revalidatePath(`/p/pulse/${id}`)
  return { success: true }
}

export const createTenantPulse = async (formData: {
  candidate_name: string
  selection_step: string
}) => {
  // 人事担当者が発行するため、通常のクライアントを使用（RLSによって自身のtenant_idに紐づく）
  const supabase = await createClient()

  // user sessionをチェックし、getServerUser でテナント情報を取得
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('Tenant ID not found')
  }

  const { data, error } = await supabase
    .from('candidate_pulses')
    .insert([{
      tenant_id: serverUser.tenant_id,
      candidate_name: formData.candidate_name,
      selection_step: formData.selection_step,
    }])
    .select('id')
    .single()

  if (error) {
    console.error('createTenantPulse error:', error)
    throw new Error('アンケートの発行に失敗しました。')
  }

  revalidatePath('/adm/pulse')
  return { success: true, id: data.id }
}

export const createAndSendPulseRequest = async (formData: {
  candidate_name: string
  candidate_email: string
  selection_step: string
}) => {
  const supabase = await createClient()

  // user sessionをチェックし、getServerUser でテナント情報を取得
  const serverUser = await getServerUser()
  if (!serverUser || !serverUser.tenant_id) {
    throw new Error('Tenant ID not found')
  }

  // 1. DBへ挿入
  const { data, error } = await supabase
    .from('candidate_pulses')
    .insert([{
      tenant_id: serverUser.tenant_id,
      candidate_name: formData.candidate_name,
      selection_step: formData.selection_step,
    }])
    .select('id')
    .single()

  if (error || !data) {
    console.error('createAndSendPulseRequest DB error:', error)
    throw new Error('アンケートの発行に失敗しました。')
  }

  // 2. URLの構築
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const pulseUrl = `${baseUrl}/p/pulse/${data.id}`

  // 3. メールの送信
  try {
    await sendPulseEmail(formData.candidate_email, formData.candidate_name, pulseUrl)
  } catch (mailError) {
    console.error('Email error:', mailError)
    // メール送信失敗してもDBレコードは残る
    throw new Error(`アンケートは発行されましたが、メールの送信に失敗しました。（エラー: ${mailError instanceof Error ? mailError.message : String(mailError)}）\nURLを手動でお伝えください。`)
  }

  revalidatePath('/adm/pulse')
  return { success: true, id: data.id }
}
