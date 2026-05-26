'use server'

import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWelcomeEmail, sendBankTransferEmail } from '@/lib/mail/send'
import type { SignupFormData, SignupActionResult, PlanType } from './types'
import { PLAN_CONFIG } from './types'
import { signupSchema } from './schemas'

// ─────────────────────────────────────────────────────────────────────────────
// Stripe インスタンス（サーバー専用）
// ─────────────────────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY が未設定です')
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

// ─────────────────────────────────────────────────────────────────────────────
// パスワード生成ユーティリティ
// ─────────────────────────────────────────────────────────────────────────────

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// ─────────────────────────────────────────────────────────────────────────────
// contract_end_at の計算
// ─────────────────────────────────────────────────────────────────────────────

function calcContractEndAt(months: number | null): string | null {
  if (months === null) return null
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe PaymentIntent 作成（Step 2 で呼び出す）
// ─────────────────────────────────────────────────────────────────────────────

export async function createPaymentIntent(
  plan: PlanType,
  email: string,
  companyName: string
): Promise<{ clientSecret: string; paymentIntentId: string; bankTransfer?: object }> {
  if (plan === 'free') throw new Error('無料プランに PaymentIntent は不要です')

  const stripe = getStripe()

  const customer = await stripe.customers.create({
    email,
    name: companyName,
    metadata: { plan, source: 'self_signup' },
  })

  if (plan === 'pro') {
    const priceId = process.env.STRIPE_PRO_PRICE_ID
    if (!priceId) throw new Error('STRIPE_PRO_PRICE_ID が未設定です')

    const price = await stripe.prices.retrieve(priceId)
    const amount = price.unit_amount ?? 0

    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      customer: customer.id,
      payment_method_types: ['card'],
      metadata: { plan, company_name: companyName, customer_email: email },
    })

    return {
      clientSecret: pi.client_secret!,
      paymentIntentId: pi.id,
    }
  }

  // enterprise: 銀行振込（customer_balance）
  const priceId = process.env.STRIPE_ENTERPRISE_PRICE_ID
  if (!priceId) throw new Error('STRIPE_ENTERPRISE_PRICE_ID が未設定です')

  const price = await stripe.prices.retrieve(priceId)
  const amount = price.unit_amount ?? 0

  const pi = await stripe.paymentIntents.create({
    amount,
    currency: 'jpy',
    customer: customer.id,
    payment_method_types: ['customer_balance'],
    payment_method_data: { type: 'customer_balance' },
    payment_method_options: {
      customer_balance: {
        funding_type: 'bank_transfer',
        bank_transfer: { type: 'jp_bank_transfer' },
      },
    },
    confirm: true,
    metadata: {
      plan,
      company_name: companyName,
      customer_email: email,
    },
  })

  const instructions = (pi.next_action as unknown as Record<string, unknown>)
    ?.display_bank_transfer_instructions

  return {
    clientSecret: pi.client_secret!,
    paymentIntentId: pi.id,
    bankTransfer: (instructions as object) ?? {},
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// サインアップ完了（テナント + ユーザー登録）
// createAdminClient 使用 — 新テナントのブートストラップ専用
// ─────────────────────────────────────────────────────────────────────────────

export async function completeSignup(data: SignupFormData): Promise<SignupActionResult> {
  const parsed = signupSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: '入力内容に誤りがあります: ' + parsed.error.issues[0].message }
  }

  const { plan, applicantName, companyName, email, paymentIntentId } = data
  const config = PLAN_CONFIG[plan]
  const supabase = createAdminClient()

  let tenantId: string | null = null
  let contractId: string | null = null
  let userId: string | null = null

  try {
    // ① tenants INSERT
    const contractEndAt = calcContractEndAt(config.contractMonths)

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: companyName,
        plan_type: plan,
        max_employees: config.maxEmployees,
        status: config.initialStatus,
        contract_end_at: contractEndAt,
      })
      .select('id')
      .single()

    if (tenantError || !tenant) {
      return { success: false, error: 'テナント作成失敗: ' + (tenantError?.message ?? '') }
    }
    tenantId = tenant.id

    // Stripe Customer ID と支払金額を取得（有料プランのみ）
    let stripeCustomerId: string | undefined
    let paidAmount = 0
    if (plan !== 'free' && paymentIntentId) {
      const stripe = getStripe()
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
      stripeCustomerId = typeof pi.customer === 'string' ? pi.customer : undefined
      paidAmount = pi.amount
    }

    // ② tenant_contracts INSERT
    const now = new Date().toISOString()

    const { data: contract, error: contractError } = await supabase
      .from('tenant_contracts')
      .insert({
        tenant_id: tenantId,
        applicant_name: applicantName,
        applicant_email: email,
        company_name: companyName,
        plan_type: plan,
        max_employees: config.maxEmployees,
        payment_method: config.paymentMethod,
        paid_amount: paidAmount,
        stripe_customer_id: stripeCustomerId ?? null,
        stripe_payment_intent_id: paymentIntentId ?? null,
        payment_status: config.paymentStatus,
        contract_start_at: plan !== 'enterprise' ? now : null,
        contract_end_at: contractEndAt,
      })
      .select('id')
      .single()

    if (contractError || !contract) {
      await supabase.from('tenants').delete().eq('id', tenantId)
      return { success: false, error: '申込情報保存失敗: ' + (contractError?.message ?? '') }
    }
    contractId = contract.id

    // ③ auth.users 作成（RPC）
    const tempPassword = generateTempPassword()

    const { data: newUserId, error: rpcError } = await supabase.rpc('create_auth_user', {
      p_email: email,
      p_password: tempPassword,
    })

    if (rpcError || !newUserId) {
      await supabase.from('tenant_contracts').delete().eq('id', contractId)
      await supabase.from('tenants').delete().eq('id', tenantId)
      return {
        success: false,
        error: 'ユーザー作成失敗: ' + (rpcError?.message ?? 'IDが返されませんでした'),
      }
    }
    userId = newUserId as string

    // Stripe Customer ID をテナントに紐付け（有料プランのみ）
    if (stripeCustomerId) {
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', tenantId)
    }

    // ④ employees INSERT（申込者を第1号従業員として登録）
    const { data: hrRole } = await supabase
      .from('app_role')
      .select('id')
      .eq('app_role', 'hr')
      .single()

    const { error: empError } = await supabase.from('employees').insert({
      user_id: userId,
      tenant_id: tenantId,
      name: applicantName,
      is_manager: true,
      active_status: 'active',
      app_role_id: hrRole?.id ?? null,
    })

    if (empError) {
      await Promise.resolve(supabase.rpc('delete_auth_user', { p_user_id: userId })).catch(
        () => null
      )
      await supabase.from('tenant_contracts').delete().eq('id', contractId)
      await supabase.from('tenants').delete().eq('id', tenantId)
      return { success: false, error: '従業員登録失敗: ' + empError.message }
    }

    // ⑥ パスワード設定リンク生成（72時間有効）
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const { data: recoveryToken } = await supabase.rpc('generate_recovery_token', {
      p_user_id: userId,
      p_expiry_hours: 72,
    })

    const resetLink = recoveryToken
      ? `${appUrl}/reset-password?token=${recoveryToken}&email=${encodeURIComponent(email)}`
      : `${appUrl}/login`

    // ⑦ メール送信
    try {
      if (plan === 'enterprise' && data.bankTransferInstructions) {
        await sendBankTransferEmail(email, applicantName, data.bankTransferInstructions, resetLink)
      } else {
        await sendWelcomeEmail(email, applicantName, plan, resetLink)
      }
    } catch (emailError) {
      // メール失敗はロールバック不要（登録は完了している）
      console.warn('ウェルカムメール送信失敗（登録は完了済み）:', emailError)
    }

    return { success: true, redirectTo: '/signup/complete' }
  } catch (error) {
    console.error('completeSignup 予期せぬエラー:', error)

    // ベストエフォートロールバック
    if (userId)
      await Promise.resolve(supabase.rpc('delete_auth_user', { p_user_id: userId })).catch(
        () => null
      )
    if (contractId)
      await Promise.resolve(supabase.from('tenant_contracts').delete().eq('id', contractId)).catch(
        () => null
      )
    if (tenantId)
      await Promise.resolve(supabase.from('tenants').delete().eq('id', tenantId)).catch(() => null)

    return { success: false, error: '予期せぬエラーが発生しました' }
  }
}
