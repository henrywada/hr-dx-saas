'use client'

import { useEffect, useId, useRef } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (errorMessage: string) => void
  fps?: number
  qrbox?: number
}

export default function QrScanner({
  onScanSuccess,
  onScanError,
  fps = 10,
  qrbox = 250,
}: QrScannerProps) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const readerId = `myouQrReader${reactId}`
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  // コールバックは ref で保持する。呼び出し側が useCallback していなくても
  // 親の再レンダーでスキャナー（カメラ）が破棄・再初期化されないようにするため
  const onScanSuccessRef = useRef(onScanSuccess)
  const onScanErrorRef = useRef(onScanError)

  // レンダーごとに最新のコールバックを ref に反映する（レンダー中の ref 更新は不可のため effect で行う）
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess
    onScanErrorRef.current = onScanError
  })

  useEffect(() => {
    let cancelled = false
    const scanner = new Html5QrcodeScanner(
      readerId,
      {
        fps,
        qrbox,
        rememberLastUsedCamera: true,
        // カメラが使えない環境でも、QR画像ファイルから読み取れるようにする
        supportedScanTypes: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA,
          Html5QrcodeScanType.SCAN_TYPE_FILE,
        ],
      },
      /* verbose= */ false
    )
    scannerRef.current = scanner

    scanner.render(
      decodedText => {
        if (cancelled) return
        onScanSuccessRef.current(decodedText)
      },
      errorMessage => {
        if (cancelled) return
        onScanErrorRef.current?.(errorMessage)
      }
    )

    return () => {
      cancelled = true
      scanner.clear().catch(() => {})
      if (scannerRef.current === scanner) scannerRef.current = null
    }
  }, [fps, qrbox, readerId])

  return (
    <div className="myou-qr-scanner w-full max-w-md mx-auto rounded-lg border border-gray-200 bg-white shadow-sm [&_button]:mt-2 [&_button]:rounded-lg [&_button]:border [&_button]:border-blue-200 [&_button]:bg-blue-600 [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-white [&_button]:hover:bg-blue-700">
      <div id={readerId} className="w-full" />
    </div>
  )
}
