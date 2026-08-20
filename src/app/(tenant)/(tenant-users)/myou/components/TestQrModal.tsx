'use client'

import { useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, QrCode } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { buildLotQrPayload } from '@/features/myou/lib/qr-parser'

interface TestQrModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 製品ラベル用QRコードを、LOT / MFG / NO の入力から作成するモーダル。
 * NO が空のときは LOT と MFG のみを埋め込んだQRコードを生成する。
 */
export default function TestQrModal({ open, onOpenChange }: TestQrModalProps) {
  const [lotNo, setLotNo] = useState('')
  const [manufacturedDate, setManufacturedDate] = useState('')
  const [serialNo, setSerialNo] = useState('')
  const [payload, setPayload] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetForm = () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = null
    }
    setLotNo('')
    setManufacturedDate('')
    setSerialNo('')
    setPayload('')
    setCopied(false)
    setError('')
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const handleCreate = () => {
    const trimmedLot = lotNo.trim()
    if (!trimmedLot) {
      setError('LOTは必須です。')
      setPayload('')
      return
    }

    setError('')
    setCopied(false)
    setPayload(
      buildLotQrPayload(
        trimmedLot,
        manufacturedDate.trim() || undefined,
        serialNo.trim() || undefined
      )
    )
  }

  const handleCopy = async () => {
    if (!payload) return
    try {
      await navigator.clipboard.writeText(payload)
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
          <DialogTitle className="text-lg font-bold text-neutral-800">
            製品ラベルQRコード作成
          </DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            LOT・製造日・シリアルNoを入力して製品ラベル用のQRコードを作成します
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto overscroll-contain">
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault()
              handleCreate()
            }}
          >
            <div>
              <label htmlFor="test-qr-lot" className="block text-xs font-medium text-gray-700 mb-1">
                LOT:<span className="ml-1 text-red-500">必須</span>
              </label>
              <input
                id="test-qr-lot"
                type="text"
                value={lotNo}
                onChange={e => setLotNo(e.target.value)}
                placeholder="LOT-20260820-0001"
                required
                aria-required="true"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label htmlFor="test-qr-mfg" className="block text-xs font-medium text-gray-700 mb-1">
                MFG:
              </label>
              <input
                id="test-qr-mfg"
                type="date"
                value={manufacturedDate}
                onChange={e => setManufacturedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label htmlFor="test-qr-no" className="block text-xs font-medium text-gray-700 mb-1">
                NO:
              </label>
              <input
                id="test-qr-no"
                type="text"
                value={serialNo}
                onChange={e => setSerialNo(e.target.value)}
                placeholder="空欄の場合は LOT と MFG のみで作成"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" variant="primary" size="md" className="w-full">
              <QrCode className="h-4 w-4" />
              QRコードを作成
            </Button>
          </form>

          {payload && (
            <div className="space-y-3 pt-1">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <QRCodeSVG value={payload} size={192} marginSize={2} className="mx-auto" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">埋め込みデータ</p>
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
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs break-all">
                {payload}
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                「入荷登録（QRスキャン）」のカメラでこのQRコードを読み取ると、入荷処理の動作確認ができます。
              </p>
            </div>
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
