'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, X, Copy, Check } from 'lucide-react'
import { buildQrPayload } from '@/features/myou/lib/qr-parser'

// 外部サービスに依存せず、同梱の qrcode.react でローカル生成する
function generateTestPayload(): string {
  const serial = 'TEST-' + Math.floor(1000 + Math.random() * 9000)
  return buildQrPayload(serial, '2026-12-31')
}

export default function TestQrModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [testData, setTestData] = useState(generateTestPayload)

  const generateData = () => {
    setTestData(generateTestPayload())
  }

  const handleOpen = () => {
    generateData() // 開くたびに新しい番号を生成
    setIsOpen(true)
  }

  const handleCopy = () => {
    if (!testData) return
    navigator.clipboard.writeText(testData)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* ボタン配置セクション */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="bg-white p-3 rounded-xl shadow-sm">
              <QrCode className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-black text-gray-900">開発・テスト用ツール</h4>
              <p className="text-xs text-gray-500 font-medium">
                納入登録の動作確認に使用できるテスト用QRコードを表示します。
              </p>
            </div>
          </div>
          <button
            onClick={handleOpen}
            className="w-full md:w-auto px-6 py-3 bg-white hover:bg-gray-50 text-blue-600 border border-blue-200 rounded-xl text-sm font-black shadow-sm transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <QrCode className="h-4 w-4" />
            <span>テストQRコードを表示</span>
          </button>
        </div>
      </div>

      {/* モーダル */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex items-center justify-between text-white">
              <h3 className="text-xl font-black">テスト用QRコード</h3>
              <button
                onClick={() => setIsOpen(false)}
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
                「納入登録（QRスキャン）」画面を開き、このQRコードをカメラで読み取ってください。ランダムなシリアル番号で登録テストが可能です。
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-sm font-black transition-all active:scale-95"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
