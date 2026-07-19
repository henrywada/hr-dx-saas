'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, X } from 'lucide-react'
import type { TraceLabel } from '@/features/myou/types'

interface TraceQrModalProps {
  label: TraceLabel
  onClose: () => void
}

/**
 * 出荷登録直後に自動で開く、トレーサビリティQRの印刷モーダル。
 * 発行されるQRコード（trace_no）は出荷1件につき1件のみ。缶単位で複数枚の物理ラベルが
 * 必要な場合は、印刷部数を運用者が指定し、同一QR画像を指定部数だけ複製印刷する
 * （内容の異なるQRを個体ごとに発行するバッチ発行は行わない）。
 * 印刷部数の既定値は出荷数量（label.quantity）。
 */
const MAX_PRINT_COPIES = 1000

export default function TraceQrModal({ label, onClose }: TraceQrModalProps) {
  const [printCopies, setPrintCopies] = useState(Math.min(label.quantity, MAX_PRINT_COPIES))

  const canPrint = !Number.isNaN(printCopies) && printCopies >= 1

  const handlePrint = () => {
    if (!canPrint) return
    window.print()
  }

  const copies = Array.from({ length: Math.max(printCopies, 0) })

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
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-500 mb-0.5">ロット番号</p>
                <p className="font-mono font-semibold text-gray-900">{label.lot_no}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">TraceNo</p>
                <p className="font-mono font-semibold text-gray-900">{label.trace_no}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">出荷数量</p>
                <p className="font-semibold text-gray-900">{label.quantity}個</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">有効期限</p>
                <p className="font-semibold text-gray-900">{label.expiration_date}</p>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <QRCodeSVG value={label.qr_payload} size={144} marginSize={2} />
              <p className="text-[10px] text-gray-500 font-mono break-all text-center">
                {label.qr_payload}
              </p>
            </div>

            <div>
              <label
                htmlFor="print-copies"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                印刷部数（缶1本ごとに貼付する場合は本数分を指定）
              </label>
              <input
                id="print-copies"
                type="number"
                min={1}
                max={MAX_PRINT_COPIES}
                value={printCopies}
                onChange={e => setPrintCopies(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!canPrint}
              className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>{printCopies}枚印刷する</span>
            </button>
          </div>
        </div>
      </div>

      {/* 印刷用ビュー: モーダルのオーバーレイは print:hidden で消えるため、印刷対象は別要素として並置する。
          同一QR画像を印刷部数分だけ複製表示する（内容はすべて同一のtrace_no）。
          .print-target により、サイドバー等の共通レイアウトを含め印刷時はこの要素のみが表示される */}
      <div className="print-target hidden print:grid print:grid-cols-3 print:content-start print:items-start print:justify-items-start print:gap-2 print:p-4">
        {copies.map((_, index) => (
          <div key={index} className="flex items-start justify-start">
            <QRCodeSVG value={label.qr_payload} size={110} marginSize={2} />
          </div>
        ))}
      </div>
    </>
  )
}
