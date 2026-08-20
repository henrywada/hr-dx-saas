'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import TestQrModal from './TestQrModal'

/**
 * 入荷登録画面の操作ガイド末尾に置く、製品ラベルQRコード作成ボタン。
 * 押すと LOT / MFG / NO を入力して製品ラベル用QRコードを作成するモーダルを開く。
 */
export default function ReceivingTestQrButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <QrCode className="h-3.5 w-3.5" />
          製品ラベルQRコード作成
        </button>
      </div>
      <TestQrModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
