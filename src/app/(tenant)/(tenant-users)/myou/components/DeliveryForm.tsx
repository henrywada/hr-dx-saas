'use client'

import { useState, useTransition } from 'react'
import { deliverFromLot } from '@/features/myou/actions'
import { parseLotQrContent } from '@/features/myou/lib/qr-parser'
import type { MyouCompany, TraceLabel } from '@/features/myou/types'
import QrScanner from './QrScanner'
import TraceQrModal from './TraceQrModal'

interface DeliveryFormProps {
  companies: MyouCompany[]
}

/**
 * 出荷登録フォーム（（株）ミュー → 施工会社、ロット引当）
 * 出荷先・受注数量を指定したうえでロットQRをスキャンし、数量分をロット残数から
 * 引き当てて出荷登録する。登録成功時はトレーサビリティQRを自動発行し、印刷モーダルを開く。
 * ロット残数が不足する場合は自動分割せず、別ロットの再スキャンを促す。
 */
export default function DeliveryForm({ companies }: DeliveryFormProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [issuedLabel, setIssuedLabel] = useState<TraceLabel | null>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning'
    text: string
  } | null>(null)

  const handleScanSuccess = (decodedText: string) => {
    if (isPending) return

    if (!selectedCompanyId) {
      setMessage({ type: 'error', text: '先に出荷先（施工会社）を選択してください。' })
      return
    }
    if (Number.isNaN(quantity) || quantity < 1) {
      setMessage({ type: 'error', text: '受注数量を入力してください。' })
      return
    }

    const { lotNo } = parseLotQrContent(decodedText)
    setMessage(null)

    startTransition(async () => {
      const result = await deliverFromLot({
        lot_no: lotNo,
        company_id: selectedCompanyId,
        quantity,
      })

      if (result.success && result.label) {
        setMessage({ type: 'success', text: `出荷登録成功: ${lotNo}（${quantity}個）` })
        setIssuedLabel(result.label)
      } else {
        setMessage({ type: 'error', text: result.error || '登録に失敗しました。' })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
            出荷先（施工会社）を選択してください
          </label>
          <select
            id="company"
            value={selectedCompanyId}
            onChange={e => setSelectedCompanyId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- 選択してください --</option>
            {companies.map(company => (
              <option key={company.company_id} value={company.company_id}>
                {company.company_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            受注数量（缶の本数）
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="relative">
        <QrScanner onScanSuccess={handleScanSuccess} />
        {isPending && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : message.type === 'warning'
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="text-center text-gray-500 text-sm">
        <p>ロットQRコードを枠内に収めてスキャンしてください</p>
        <p className="mt-1">※カメラの使用許可が必要です</p>
        <p className="mt-1">
          残数が不足しているロットをスキャンした場合はエラーになります。別のロットをスキャンしてください。
        </p>
      </div>

      {issuedLabel && <TraceQrModal label={issuedLabel} onClose={() => setIssuedLabel(null)} />}
    </div>
  )
}
