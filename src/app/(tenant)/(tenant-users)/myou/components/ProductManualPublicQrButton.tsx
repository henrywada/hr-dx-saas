'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import ProductManualPublicQrModal from './ProductManualPublicQrModal'

/**
 * 取扱説明書アップロードカード最下部の公開QR確認ボタン。
 */
export default function ProductManualPublicQrButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden />
          QRコードテスト
        </button>
      </div>
      <ProductManualPublicQrModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
