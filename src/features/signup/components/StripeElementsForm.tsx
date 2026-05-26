'use client'

import { useState } from 'react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

interface StripeElementsFormProps {
  clientSecret: string
  onSuccess: (paymentIntentId: string) => void
  onError: (message: string) => void
  isSubmitting: boolean
}

export function StripeElementsForm({
  clientSecret,
  onSuccess,
  onError,
  isSubmitting,
}: StripeElementsFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardError, setCardError] = useState<string>('')

  const handleConfirm = async () => {
    if (!stripe || !elements) return

    const card = elements.getElement(CardElement)
    if (!card) return

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    })

    if (error) {
      const msg = error.message ?? 'カード決済に失敗しました'
      setCardError(msg)
      onError(msg)
    } else if (paymentIntent) {
      setCardError('')
      onSuccess(paymentIntent.id)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#374151',
                '::placeholder': { color: '#9CA3AF' },
              },
              invalid: { color: '#EF4444' },
            },
          }}
        />
      </div>

      {cardError && <p className="text-sm text-red-600">{cardError}</p>}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isSubmitting || !stripe}
        className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '処理中...' : 'カードを確認する'}
      </button>
    </div>
  )
}
