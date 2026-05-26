import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/mail/send'

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY が未設定です')
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET 未設定' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'stripe-signature ヘッダーなし' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '署名検証失敗'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const supabase = createAdminClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await handlePaymentSucceeded(supabase, pi)
      break
    }
    case 'payment_intent.partially_funded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await handlePartiallyFunded(supabase, pi)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await handlePaymentFailed(supabase, pi)
      break
    }
    default:
      break
  }

  return NextResponse.json({ received: true })
}

async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  pi: Stripe.PaymentIntent
) {
  const { data: existing } = await supabase
    .from('tenant_contracts')
    .select('id, tenant_id, payment_status, applicant_email, applicant_name, plan_type')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle()

  if (!existing) {
    console.warn('[Stripe Webhook] payment_intent.succeeded: 対応する tenant_contracts なし', pi.id)
    return
  }

  if (existing.payment_status === 'paid') return // 冪等

  const now = new Date().toISOString()

  await supabase
    .from('tenant_contracts')
    .update({ payment_status: 'paid', contract_start_at: now })
    .eq('id', existing.id)

  await supabase.from('tenants').update({ status: 'active' }).eq('id', existing.tenant_id)

  // enterprise 銀行振込入金確認後: 利用開始メール
  if (existing.plan_type === 'enterprise') {
    try {
      await sendMail({
        to: existing.applicant_email,
        subject: '【HR-DX】ご入金を確認しました・ご利用開始のご案内',
        html: `<p>${existing.applicant_name} 様</p>
<p>ご入金を確認いたしました。HR-DX エンタープライズプランをご利用いただけます。</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.hr-dx.jp'}/login">ログイン画面へ</a></p>
<p>よろしくお願いいたします。<br>HR-DX サポートチーム</p>`,
      })
    } catch (e) {
      console.warn('[Stripe Webhook] 利用開始メール送信失敗:', e)
    }
  }
}

async function handlePartiallyFunded(
  supabase: ReturnType<typeof createAdminClient>,
  pi: Stripe.PaymentIntent
) {
  const { data: existing } = await supabase
    .from('tenant_contracts')
    .select('id, applicant_email, applicant_name')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle()

  if (!existing) return

  const received = pi.amount_received ?? 0
  const remaining = pi.amount - received

  await supabase
    .from('tenant_contracts')
    .update({ payment_status: 'partially_paid', bank_transfer_amount_received: received })
    .eq('id', existing.id)

  try {
    await sendMail({
      to: existing.applicant_email,
      subject: '【HR-DX】お振込の一部を受領しました',
      html: `<p>${existing.applicant_name} 様</p>
<p>ご入金を一部確認しました（受領額: ¥${received.toLocaleString('ja-JP')}）。</p>
<p>残額 ¥${remaining.toLocaleString('ja-JP')} のお振込をお願いいたします。</p>
<p>よろしくお願いいたします。<br>HR-DX サポートチーム</p>`,
    })
  } catch (e) {
    console.warn('[Stripe Webhook] 部分入金メール送信失敗:', e)
  }
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  pi: Stripe.PaymentIntent
) {
  const { data: existing } = await supabase
    .from('tenant_contracts')
    .select('id, tenant_id, applicant_email, applicant_name')
    .eq('stripe_payment_intent_id', pi.id)
    .maybeSingle()

  if (!existing) return

  await supabase
    .from('tenant_contracts')
    .update({ payment_status: 'expired' })
    .eq('id', existing.id)

  await supabase.from('tenants').update({ status: 'suspended' }).eq('id', existing.tenant_id)

  try {
    await sendMail({
      to: existing.applicant_email,
      subject: '【HR-DX】お振込の期限が過ぎました',
      html: `<p>${existing.applicant_name} 様</p>
<p>お振込の期限が過ぎたため、アカウントを停止しました。</p>
<p>ご利用を再開される場合は、お問い合わせください。</p>
<p>よろしくお願いいたします。<br>HR-DX サポートチーム</p>`,
    })
  } catch (e) {
    console.warn('[Stripe Webhook] 期限切れメール送信失敗:', e)
  }
}
