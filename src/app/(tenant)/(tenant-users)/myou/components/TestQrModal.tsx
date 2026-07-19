'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, X, Copy, Check } from 'lucide-react'
import { buildLotQrPayload } from '@/features/myou/lib/qr-parser'

// 外部サービスに依存せず、同梱の qrcode.react でローカル生成する
function generateTestPayload(): string {
  const lotNo = 'LOT-TEST-' + Math.floor(1000 + Math.random() * 9000)
  return buildLotQrPayload(lotNo, '2026-01-01', '2026-12-31')
}

interface TestQrModalProps {
  onClose: () => void
}

/**
 * 入荷登録の動作確認に使えるテスト用QRコードを表示するモーダル。
 * 呼び出し側が開いている間だけ `{isOpen && <TestQrModal onClose={...} />}` の形でマウントする。
 * マウントのたびに新しいテスト用ロット番号を生成する。
 */
export default function TestQrModal({ onClose }: TestQrModalProps) {
  const [copied, setCopied] = useState(false)
  const [testData, setTestData] = useState(generateTestPayload)

  const generateData = () => {
    setTestData(generateTestPayload())
  }

  const handleCopy = () => {
    if (!testData) return
    navigator.clipboard.writeText(testData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex items-center justify-between text-white">
          <h3 className="text-xl font-black">テスト用QRコード</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            title="閉じる"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="bg-gray-50 p-4 rounded-2xl inline-block border border-gray-100 shadow-inner relative group">
            {testData && (
              <QRCodeSVG value={testData} size={192} marginSize={2} className="mx-auto" />
            )}
            <button
              onClick={generateData}
              className="absolute bottom-2 right-2 p-2 bg-white/90 hover:bg-white shadow-sm rounded-lg text-blue-600 transition-all active:scale-95"
              title="新しいコードを生成"
            >
              <QrCode className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                埋め込みデータ
              </p>
              <button
                onClick={generateData}
                className="text-[10px] font-bold text-blue-500 hover:text-blue-700 underline"
              >
                再生成
              </button>
            </div>
            <div className="flex items-center space-x-2 bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs overflow-hidden">
              <span className="flex-1 truncate">{testData}</span>
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="コピー"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-[10px] text-yellow-800 leading-relaxed text-left font-medium">
            <p className="font-black mb-1 flex items-center">
              <span className="mr-1">⚠️</span> 使い方
            </p>
            「入荷登録（QRスキャン）」画面を開き、このQRコードをカメラで読み取ってください。ランダムなロット番号で登録テストが可能です。
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-sm font-black transition-all active:scale-95"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
