'use client'

import { useState, useTransition } from 'react'
import { registerReceiving } from '@/features/myou/actions'
import { parseQrContent } from '@/features/myou/lib/qr-parser'
import QrScanner from './QrScanner'

/**
 * 入荷登録フォーム（製造元 →（株）ミュー）
 * QRスキャンで読み取ったシリアル番号・有効期限を在庫として登録する
 */
export default function ReceivingForm() {
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

    const { serial, expiration } = parseQrContent(decodedText)
    setLastScanned({ serial, expiration })
    setMessage(null)

    // 登録実行
    startTransition(async () => {
      const result = await registerReceiving({
        serial_number: serial,
        expiration_date: expiration,
      })

      if (result.success) {
        if (result.warning) {
          setMessage({ type: 'warning', text: result.warning })
        } else {
          setMessage({ type: 'success', text: `入荷登録成功: ${serial}` })
        }
      } else {
        setMessage({ type: 'error', text: result.error || '登録に失敗しました。' })
      }
    })
  }

  return (
    <div className="space-y-6">
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
    </div>
  )
}
