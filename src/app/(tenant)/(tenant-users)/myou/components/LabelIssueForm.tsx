'use client'

import { useState, useTransition } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, QrCode, Loader2, AlertCircle } from 'lucide-react'
import { issueLabels } from '@/features/myou/actions'
import type { IssuedLabel } from '@/features/myou/types'

/**
 * QRラベル発行フォーム
 * 有効期限と枚数を指定してシリアル番号を採番し、印刷用のQRラベルを生成する
 */
export default function LabelIssueForm() {
  const [expirationDate, setExpirationDate] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [labels, setLabels] = useState<IssuedLabel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await issueLabels({
        expiration_date: expirationDate,
        quantity,
      })

      if (result.success && result.labels) {
        setLabels(result.labels)
      } else {
        setError(result.error || 'ラベルの発行に失敗しました。')
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* 発行フォーム（印刷時は非表示） */}
      <form
        onSubmit={handleSubmit}
        className="print:hidden bg-white rounded-xl shadow-md border border-gray-200 p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="expiration" className="block text-xs font-medium text-gray-700 mb-1">
              有効期限
            </label>
            <input
              id="expiration"
              type="date"
              required
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="quantity" className="block text-xs font-medium text-gray-700 mb-1">
              発行枚数（最大100枚）
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={100}
              required
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !expirationDate}
            className="flex items-center justify-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>発行中...</span>
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4" />
                <span>ラベルを発行する</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* 発行結果（ラベルシート） */}
      {labels.length > 0 && (
        <div className="space-y-4">
          <div className="print:hidden flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                発行済みラベル（{labels.length}枚）
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                シリアル番号 {labels[0].serial_number} 〜 {labels[labels.length - 1].serial_number}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>印刷する</span>
            </button>
          </div>

          {/* ラベルグリッド: 印刷時にも同じレイアウトで出力される */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
            {labels.map(label => (
              <div
                key={label.serial_number}
                className="bg-white border border-gray-300 rounded-lg p-4 flex flex-col items-center space-y-2 break-inside-avoid print:rounded-none print:border-gray-400"
              >
                <QRCodeSVG value={label.qr_payload} size={112} marginSize={2} />
                <div className="text-center">
                  <p className="font-mono text-[11px] font-bold text-gray-900">
                    {label.serial_number}
                  </p>
                  <p className="text-[10px] text-gray-600">有効期限: {label.expiration_date}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    セルフィール MS ／ 高温・直射日光を避けて保管
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
