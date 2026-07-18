'use client'

import { useState, useTransition } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, QrCode, Loader2, AlertCircle } from 'lucide-react'
import { issueLots } from '@/features/myou/actions'
import type { IssuedLot } from '@/features/myou/types'

/**
 * 製造ロットQR発行フォーム
 * 有効期限と件数を指定してロット番号を採番し、印刷用のQRラベル（段ボール1箱に1枚）を生成する。
 * 数量（缶の本数）はこの時点では確定しないため入力しない（入荷登録で確定する）。
 */
export default function LabelIssueForm() {
  const [expirationDate, setExpirationDate] = useState('')
  const [manufacturedDate, setManufacturedDate] = useState('')
  const [count, setCount] = useState(1)
  const [lots, setLots] = useState<IssuedLot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await issueLots({
        expiration_date: expirationDate,
        manufactured_date: manufacturedDate || undefined,
        count,
      })

      if (result.success && result.lots) {
        setLots(result.lots)
      } else {
        setError(result.error || 'ロットQRの発行に失敗しました。')
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
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="manufactured" className="block text-xs font-medium text-gray-700 mb-1">
              製造日（任意）
            </label>
            <input
              id="manufactured"
              type="date"
              value={manufacturedDate}
              onChange={e => setManufacturedDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
            <label htmlFor="count" className="block text-xs font-medium text-gray-700 mb-1">
              発行件数（最大100件）
            </label>
            <input
              id="count"
              type="number"
              min={1}
              max={100}
              required
              value={count}
              onChange={e => setCount(Number(e.target.value))}
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
                <span>ロットQRを発行する</span>
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
      {lots.length > 0 && (
        <div className="space-y-4">
          <div className="print:hidden flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                発行済みロットQR（{lots.length}件）
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                ロット番号 {lots[0].lot_no} 〜 {lots[lots.length - 1].lot_no}
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

          {/* ラベルグリッド: 印刷時にも同じレイアウトで出力される。
              .print-target により、サイドバー等の共通レイアウトを含め印刷時はこの要素のみが表示される */}
          <div className="print-target grid grid-cols-2 sm:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
            {lots.map(lot => (
              <div
                key={lot.lot_no}
                className="bg-white border border-gray-300 rounded-lg p-4 flex flex-col items-center space-y-2 break-inside-avoid print:rounded-none print:border-gray-400"
              >
                <QRCodeSVG value={lot.qr_payload} size={112} marginSize={2} />
                <div className="text-center">
                  <p className="font-mono text-[11px] font-bold text-gray-900">{lot.lot_no}</p>
                  <p className="text-[10px] text-gray-600">有効期限: {lot.expiration_date}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    製造ロットQR ／ 段ボール1箱に1枚貼付
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
