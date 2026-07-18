'use client'

import { useState, useTransition } from 'react'
import { registerDelivery } from '@/features/myou/actions'
import { parseQrContent } from '@/features/myou/lib/qr-parser'
import type { MyouCompany } from '@/features/myou/types'
import QrScanner from './QrScanner'
import TraceQrModal from './TraceQrModal'

interface DeliveryFormProps {
  companies: MyouCompany[]
}

/**
 * 出荷登録フォーム（（株）ミュー → 施工会社）
 * 出荷先を選択したうえでQRスキャンし、出荷履歴を記録する
 */
export default function DeliveryForm({ companies }: DeliveryFormProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false)
  const [lastScanned, setLastScanned] = useState<{
    serial: string
    expiration: string
  } | null>(null)
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

    const { serial, expiration } = parseQrContent(decodedText)
    setLastScanned({ serial, expiration })
    setMessage(null)

    // 登録実行
    startTransition(async () => {
      const result = await registerDelivery({
        serial_number: serial,
        expiration_date: expiration,
        company_id: selectedCompanyId,
      })

      if (result.success) {
        if (result.warning) {
          setMessage({ type: 'warning', text: result.warning })
        } else {
          setMessage({ type: 'success', text: `出荷登録成功: ${serial}` })
        }
      } else {
        setMessage({ type: 'error', text: result.error || '登録に失敗しました。' })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
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

      {lastScanned && message?.type === 'success' && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">直前のスキャン内容:</h3>
          <p className="text-xs text-blue-800">シリアル: {lastScanned.serial}</p>
          <p className="text-xs text-blue-800">有効期限: {lastScanned.expiration}</p>
        </div>
      )}

      <div className="text-center text-gray-500 text-sm">
        <p>QRコードを枠内に収めてスキャンしてください</p>
        <p className="mt-1">※カメラの使用許可が必要です</p>
      </div>

      {selectedCompanyId && (
        <div className="text-left">
          <button
            type="button"
            onClick={() => setIsTraceModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            QRコード発行
          </button>
        </div>
      )}

      {isTraceModalOpen && (
        <TraceQrModal
          companyId={selectedCompanyId}
          initialSerial={lastScanned?.serial ?? ''}
          initialExpiration={lastScanned?.expiration ?? ''}
          onClose={() => setIsTraceModalOpen(false)}
        />
      )}
    </div>
  )
}
