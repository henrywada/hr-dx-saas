'use client'

import { useState, useTransition } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, X, Loader2, AlertCircle } from 'lucide-react'
import { issueTraceLabel } from '@/features/myou/actions'
import type { TraceLabel } from '@/features/myou/types'

interface TraceQrModalProps {
  companyId: string
  initialSerial: string
  initialExpiration: string
  onClose: () => void
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * 出荷先選択済みの状態で開く、トレーサビリティQRラベル発行モーダル。
 * シリアル番号・有効期限は直前のスキャン結果を初期値としてコピーするが、編集可能。
 */
export default function TraceQrModal({
  companyId,
  initialSerial,
  initialExpiration,
  onClose,
}: TraceQrModalProps) {
  const [serial, setSerial] = useState(initialSerial)
  const [expiration, setExpiration] = useState(initialExpiration)
  const [issuedLabel, setIssuedLabel] = useState<TraceLabel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const canIssue = serial.trim().length > 0 && DATE_PATTERN.test(expiration)

  const handlePrint = () => {
    // 発行済みなら新たに登録せず、そのまま再印刷する（TraceNoの二重消費を防ぐ）
    if (issuedLabel) {
      window.print()
      return
    }
    if (!canIssue || isPending) return

    setError(null)
    startTransition(async () => {
      const result = await issueTraceLabel({
        company_id: companyId,
        serial_number: serial,
        expiration_date: expiration,
      })

      if (result.success && result.label) {
        setIssuedLabel(result.label)
        window.print()
      } else {
        setError(result.error || 'トレーサビリティQRの発行に失敗しました。')
      }
    })
  }

  const handleReissue = () => {
    setIssuedLabel(null)
    setError(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:hidden">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex items-center justify-between text-white">
            <h3 className="text-lg font-bold">トレーサビリティQRコード発行</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title="閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label
                htmlFor="trace-serial"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                シリアル番号
              </label>
              <input
                id="trace-serial"
                type="text"
                value={serial}
                onChange={e => setSerial(e.target.value)}
                readOnly={!!issuedLabel}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 read-only:bg-gray-50"
                placeholder="MS-20260707-0001"
              />
            </div>
            <div>
              <label
                htmlFor="trace-expiration"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                有効期限
              </label>
              <input
                id="trace-expiration"
                type="date"
                value={expiration}
                onChange={e => setExpiration(e.target.value)}
                readOnly={!!issuedLabel}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 read-only:bg-gray-50"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {issuedLabel && (
              <div className="flex flex-col items-center space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <QRCodeSVG value={issuedLabel.qr_payload} size={144} marginSize={2} />
                <p className="text-[10px] text-gray-500 font-mono break-all text-center">
                  {issuedLabel.qr_payload}
                </p>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              {issuedLabel && (
                <button
                  type="button"
                  onClick={handleReissue}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  新しく発行し直す
                </button>
              )}
              <button
                type="button"
                onClick={handlePrint}
                disabled={!issuedLabel && (!canIssue || isPending)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>発行中...</span>
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    <span>{issuedLabel ? '再印刷する' : 'QRコード印刷'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 印刷用ビュー: モーダルのオーバーレイは print:hidden で消えるため、印刷対象は別要素として並置する */}
      {issuedLabel && (
        <div className="hidden print:flex print:flex-col print:items-center print:justify-center print:p-12">
          <QRCodeSVG value={issuedLabel.qr_payload} size={220} marginSize={2} />
          <div className="mt-6 text-center font-mono text-sm space-y-1">
            <p className="font-bold">{serial}</p>
            <p>有効期限: {expiration}</p>
            <p>出荷先No: {issuedLabel.company_no}</p>
            <p>TraceNo: {issuedLabel.trace_no}</p>
          </div>
        </div>
      )}
    </>
  )
}
