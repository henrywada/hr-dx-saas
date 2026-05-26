'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPaymentIntent, completeSignup } from '../actions'
import { StripeElementsForm } from './StripeElementsForm'
import type { PlanType, SignupFormData, BankTransferInstructions } from '../types'
import { PLAN_CONFIG } from '../types'
import { step1Schema, type Step1Input } from '../schemas'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i < current ? 'w-8 bg-primary' : i === current ? 'w-8 bg-primary/80' : 'w-4 bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

interface SignupWizardProps {
  initialPlan: PlanType
}

export function SignupWizard({ initialPlan }: SignupWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [plan] = useState<PlanType>(initialPlan)
  const config = PLAN_CONFIG[plan]

  const [step1Data, setStep1Data] = useState<Step1Input | null>(null)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [paymentIntentId, setPaymentIntentId] = useState<string>('')
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [bankTransferInfo, setBankTransferInfo] = useState<BankTransferInstructions | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Input>({ resolver: zodResolver(step1Schema) })

  const onStep1Submit = async (values: Step1Input) => {
    setStep1Data(values)

    if (plan === 'free') {
      setStep(2)
      return
    }

    setIsSubmitting(true)
    setErrorMsg('')
    try {
      const result = await createPaymentIntent(plan, values.email, values.companyName)
      setClientSecret(result.clientSecret)
      setPaymentIntentId(result.paymentIntentId)

      if (plan === 'enterprise' && result.bankTransfer) {
        const bt = result.bankTransfer as Record<string, unknown>
        const financialAddresses = bt.financial_addresses as Array<Record<string, unknown>>
        const fa = financialAddresses?.[0]
        const zengin = fa?.zengin as Record<string, unknown> | undefined

        const dueDateRaw = bt.due_date as number | null
        const dueDateStr = dueDateRaw
          ? new Date(dueDateRaw * 1000).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : ''

        setBankTransferInfo({
          bankName: (zengin?.bank_name as string) ?? '',
          branchName: (zengin?.branch_name as string) ?? undefined,
          accountType: (zengin?.account_type as string) ?? '',
          accountNumber: (zengin?.account_number as string) ?? '',
          accountHolderName: (zengin?.account_holder_name as string) ?? '',
          dueDate: dueDateStr,
          amount: (bt.amount_remaining as number) ?? 0,
        })
        setPaymentConfirmed(true)
      }

      setStep(1)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '支払い情報の取得に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onPaymentSuccess = (piId: string) => {
    setPaymentIntentId(piId)
    setPaymentConfirmed(true)
    setStep(2)
  }

  const onConfirm = async () => {
    if (!step1Data) return
    setIsSubmitting(true)
    setErrorMsg('')

    const formData: SignupFormData = {
      ...step1Data,
      plan,
      paymentIntentId: paymentIntentId || undefined,
      bankTransferInstructions: bankTransferInfo ?? undefined,
    }

    try {
      const result = await completeSignup(formData)
      if (result.success) {
        router.push(result.redirectTo ?? '/signup/complete')
      } else {
        setErrorMsg(result.error ?? '登録に失敗しました')
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '予期せぬエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const PlanBadge = () => (
    <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary mb-4">
      {config.label}
    </span>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-2">
        <PlanBadge />
        <h1 className="text-2xl font-bold text-gray-900">新規登録</h1>
      </div>

      <StepIndicator current={step} total={3} />

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Step 0: 基本情報 */}
      {step === 0 && (
        <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
          <p className="text-sm text-gray-500 text-center">STEP 1 / 3　基本情報</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              申込者氏名 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('applicantName')}
              placeholder="山田 太郎"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errors.applicantName && (
              <p className="mt-1 text-xs text-red-600">{errors.applicantName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('companyName')}
              placeholder="株式会社〇〇"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errors.companyName && (
              <p className="mt-1 text-xs text-red-600">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="admin@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">電話番号（任意）</label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="03-1234-5678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '処理中...' : '次へ'}
          </button>
        </form>
      )}

      {/* Step 1: 支払い */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center">STEP 2 / 3　お支払い</p>

          {plan === 'pro' && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeElementsForm
                clientSecret={clientSecret}
                onSuccess={onPaymentSuccess}
                onError={msg => setErrorMsg(msg)}
                isSubmitting={isSubmitting}
              />
            </Elements>
          )}

          {plan === 'enterprise' && bankTransferInfo && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">以下の口座へお振込をお願いします。</p>
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">銀行名</span>
                  <span className="font-medium">
                    {bankTransferInfo.bankName}
                    {bankTransferInfo.branchName ? `　${bankTransferInfo.branchName}` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">口座種別</span>
                  <span className="font-medium">{bankTransferInfo.accountType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">口座番号</span>
                  <span className="font-medium">{bankTransferInfo.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">口座名義</span>
                  <span className="font-medium">{bankTransferInfo.accountHolderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">振込金額</span>
                  <span className="font-medium text-primary">
                    ¥{bankTransferInfo.amount.toLocaleString('ja-JP')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">振込期限</span>
                  <span className="font-medium">{bankTransferInfo.dueDate}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                次へ（振込先を確認しました）
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: 確認 */}
      {step === 2 && step1Data && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center">STEP 3 / 3　登録確認</p>

          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">申込者氏名</span>
              <span className="font-medium">{step1Data.applicantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">会社名</span>
              <span className="font-medium">{step1Data.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">メールアドレス</span>
              <span className="font-medium break-all">{step1Data.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">プラン</span>
              <span className="font-medium">{config.label}</span>
            </div>
            {plan !== 'free' && (
              <div className="flex justify-between">
                <span className="text-gray-500">お支払い</span>
                <span className="font-medium text-green-600">確認済み ✓</span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            登録後、パスワード設定メールをお送りします（72時間有効）。
          </p>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '登録中...' : '登録する'}
          </button>

          <button
            type="button"
            onClick={() => setStep(plan === 'free' ? 0 : 1)}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            戻る
          </button>
        </div>
      )}
    </div>
  )
}
