'use client'

import { useState } from 'react'
import { parseLotQrContent } from '@/features/myou/lib/qr-parser'
import QrScanner from './QrScanner'
import ReceivingProcessModal from './ReceivingProcessModal'

/**
 * 入荷登録フォーム（製造元 →（株）ミュー）
 * QRスキャンで読み取った製造ロット番号・有効期限を保持し、「入荷処理へ進む」から
 * モーダルで数量を確認したうえで在庫登録する
 */
export default function ReceivingForm() {
  const [lastScanned, setLastScanned] = useState<{
    lotNo: string
    expiration: string
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'warning'
    text: string
  } | null>(null)

  const handleScanSuccess = (decodedText: string) => {
    const { lotNo, expiration } = parseLotQrContent(decodedText)
    setLastScanned({ lotNo, expiration })
    setMessage(null)
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <QrScanner onScanSuccess={handleScanSuccess} />
      </div>

      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {lastScanned && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">直前のスキャン内容:</h3>
          <p className="text-xs text-blue-800">ロット番号: {lastScanned.lotNo}</p>
          <p className="text-xs text-blue-800">有効期限: {lastScanned.expiration}</p>
        </div>
      )}

      <div className="text-center text-gray-500 text-sm">
        <p>QRコードを枠内に収めてスキャンしてください</p>
        <p className="mt-1">※カメラの使用許可が必要です</p>
      </div>

      <div className="text-left">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 text-xs font-semibold bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          入荷処理へ進む
        </button>
      </div>

      {isModalOpen && (
        <ReceivingProcessModal
          hasScanned={!!lastScanned}
          scannedLotNo={lastScanned?.lotNo ?? ''}
          scannedExpiration={lastScanned?.expiration ?? ''}
          onClose={() => setIsModalOpen(false)}
          onSuccess={setMessage}
        />
      )}
    </div>
  )
}
