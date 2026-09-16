'use client'

import { useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { APP_ROUTES } from '@/config/routes'

interface ProductManualPublicQrModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 製品ラベル向け公開取扱説明書ページのQRコードを表示する。
 * 埋め込みURLは現在開いているホスト基準（本番は app.hr-dx.jp）。
 */
export default function ProductManualPublicQrModal({
  open,
  onOpenChange,
}: ProductManualPublicQrModalProps) {
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const publicUrl =
    open && typeof window !== 'undefined'
      ? `${window.location.origin}${APP_ROUTES.PUBLIC.MYOU_PRODUCT_MANUALS}`
      : ''

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCopied(false)
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = null
      }
    }
    onOpenChange(nextOpen)
  }

  const handleCopy = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false)
        copyTimeoutRef.current = null
      }, 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md flex flex-col gap-0 overflow-hidden rounded-lg border-0 bg-white p-0 shadow-lg">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle className="text-lg font-bold text-neutral-800">公開QRコード</DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            製品ラベルに印刷する公開取扱説明書ページのQRコードです
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto overscroll-contain">
          {publicUrl && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <QRCodeSVG value={publicUrl} size={192} marginSize={2} className="mx-auto" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-gray-500">公開URL</p>
                <div className="flex items-center gap-2">
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    開く
                  </a>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800"
                    title="コピー"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'コピー済' : 'コピー'}
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs break-all">
                {publicUrl}
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                スマートフォンでこのQRコードを読み取ると、ログイン不要の取扱説明書メニューが開きます。
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <Button variant="outline" size="md" onClick={() => handleOpenChange(false)}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
