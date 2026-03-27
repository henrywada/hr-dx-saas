'use client'

import { Html5QrcodeScanner } from 'html5-qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { checkQrDuplicatePunch, invokeQrScan, type QrPunchPurpose } from '../actions'
import { QrPunchMobileTipsModalTrigger } from './QrPunchMobileTipsModal'

type Phase = 'idle' | 'scanning' | 'duplicate_check' | 'sending' | 'success' | 'error'

function collectDeviceInfo(): Record<string, string> {
  if (typeof navigator === 'undefined') return {}
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform ?? '',
    language: navigator.language ?? '',
    vendor: navigator.vendor ?? '',
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('geolocation_unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 18_000,
      maximumAge: 0,
    })
  })
}

function purposeLabel(p: QrPunchPurpose): string {
  return p === 'punch_in' ? '出勤' : '退勤'
}

export function AttendanceQrScanClient() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [errorDebug, setErrorDebug] = useState<string | null>(null)
  const [successPurpose, setSuccessPurpose] = useState<QrPunchPurpose>('punch_in')
  const processingRef = useRef(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const purposeRef = useRef<QrPunchPurpose>('punch_in')

  const resetFlow = useCallback(() => {
    processingRef.current = false
    setErrorMessage(null)
    setErrorDebug(null)
    setPhase('idle')
  }, [])

  const proceedWithScan = useCallback(async (token: string) => {
    setPhase('sending')
    setErrorMessage(null)

    let pos: GeolocationPosition
    try {
      pos = await getPosition()
    } catch (e: unknown) {
      const err = e as GeolocationPositionError & { message?: string }
      const code = err?.code
      let msg =
        '位置情報を取得できませんでした。設定で位置情報を許可し、GPS をオンにしてから再度お試しください。'
      if (code === 1) msg = '位置情報が拒否されています。ブラウザの設定でこのサイトへの位置情報の共有を許可してください。'
      if (code === 3) msg = '位置情報の取得がタイムアウトしました。屋外や窓際で再度お試しください。'
      setErrorMessage(msg)
      setErrorDebug(null)
      setPhase('error')
      processingRef.current = false
      return
    }

    const scanResult = await invokeQrScan({
      token,
      location: {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      },
      deviceInfo: collectDeviceInfo(),
    })

    if (scanResult.ok === false) {
      setErrorMessage(scanResult.message)
      setErrorDebug(scanResult.debug ? JSON.stringify(scanResult.debug, null, 2) : null)
      setPhase('error')
      processingRef.current = false
      return
    }

    const p = scanResult.purpose ?? purposeRef.current
    setSuccessPurpose(p)
    setPhase('success')
    processingRef.current = false
  }, [])

  const onQrDecoded = useCallback(
    (decodedText: string) => {
      if (processingRef.current) return
      processingRef.current = true
      void (async () => {
        try {
          if (scannerRef.current) {
            await scannerRef.current.clear().catch(() => {})
            scannerRef.current = null
          }
        } catch {
          /* ignore */
        }

        const token = decodedText.trim()
        if (!token) {
          setErrorMessage('QRからデータを読み取れませんでした。')
          setErrorDebug(null)
          setPhase('error')
          processingRef.current = false
          return
        }

        setPhase('duplicate_check')
        setErrorMessage(null)

        const dup = await checkQrDuplicatePunch(token)
        if (dup.ok === false) {
          setErrorMessage(dup.message)
          setErrorDebug(dup.debug ? JSON.stringify(dup.debug, null, 2) : null)
          setPhase('error')
          processingRef.current = false
          return
        }

        purposeRef.current = dup.purpose
        await proceedWithScan(token)
      })()
    },
    [proceedWithScan],
  )

  useEffect(() => {
    if (phase !== 'scanning') return

    const elId = 'attendance-qr-reader'
    const scanner = new Html5QrcodeScanner(
      elId,
      {
        fps: 10,
        qrbox: { width: 260, height: 260 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0],
      },
      false,
    )
    scannerRef.current = scanner

    scanner.render(onQrDecoded, () => {})

    return () => {
      void scanner.clear().catch(() => {})
      if (scannerRef.current === scanner) scannerRef.current = null
    }
  }, [phase, onQrDecoded])

  const secure = typeof window !== 'undefined' && window.isSecureContext

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-700 to-emerald-950 text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6 pb-24">
        <header>
          <div className="flex items-start justify-between gap-3">
            <QrPunchMobileTipsModalTrigger />
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold tracking-tight">QR 打刻（従業員）</h1>
              <p className="mt-1 text-sm text-emerald-100">上司の QR を読み取って出退勤を記録します</p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/top'
              }}
              className="min-h-10 rounded-xl border border-white/40 bg-white/10 px-4 text-sm font-bold text-white"
            >
              戻る
            </button>
          </div>
        </header>

        {!secure && (
          <div className="rounded-xl border border-amber-300/60 bg-amber-950/40 px-3 py-3 text-sm text-amber-100">
            位置情報の取得には <strong>HTTPS</strong>（または localhost）が必要です。このままでは打刻できない場合があります。
          </div>
        )}

        <section className="rounded-2xl bg-black/25 p-4 text-sm text-emerald-50">
          <p className="font-bold text-white">カメラ・位置情報の許可</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-100/95">
            <li>「スキャン開始」を押すとカメラ利用の確認が出ます。<strong>許可</strong>を選んでください。</li>
            <li>次に、現在地の共有を求められたら <strong>許可</strong>してください（打刻の位置確認に使います）。</li>
            <li>iOS Safari: 設定 → Safari → カメラ／位置情報でこのサイトを確認できます。</li>
            <li>Android Chrome: アドレスバーの鍵アイコン → 権限からカメラ・位置を確認できます。</li>
          </ul>
        </section>

        {phase === 'idle' && (
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null)
              processingRef.current = false
              setPhase('scanning')
            }}
            className="min-h-16 w-full rounded-2xl bg-white text-xl font-bold text-emerald-800 shadow-xl active:scale-[0.99]"
          >
            スキャン開始
          </button>
        )}

        {phase === 'scanning' && (
          <div className="space-y-3">
            <p className="text-center text-sm text-emerald-100">QR を枠内に収めてください。読み取り後、自動で打刻処理が始まります。</p>
            <div className="overflow-hidden rounded-2xl bg-black shadow-xl">
              <div id="attendance-qr-reader" className="w-full" />
            </div>
            <button
              type="button"
              onClick={() => {
                void scannerRef.current?.clear().catch(() => {})
                scannerRef.current = null
                processingRef.current = false
                setPhase('idle')
              }}
              className="min-h-12 w-full rounded-xl border border-white/40 bg-white/10 text-base font-semibold text-white"
            >
              キャンセル
            </button>
          </div>
        )}

        {phase === 'duplicate_check' && (
          <div className="rounded-2xl bg-black/30 px-6 py-10 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p className="text-lg font-bold">打刻内容を確認しています…</p>
            <p className="mt-2 text-sm text-emerald-100/90">そのままお待ちください</p>
            <button
              type="button"
              onClick={() => {
                processingRef.current = false
                resetFlow()
              }}
              className="mt-8 min-h-12 w-full rounded-xl border border-white/40 text-base font-semibold text-white/90"
            >
              中断して戻る
            </button>
          </div>
        )}

        {phase === 'sending' && (
          <div className="rounded-2xl bg-black/30 px-6 py-10 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p className="text-lg font-bold">位置を確認して打刻しています…</p>
            <p className="mt-2 text-sm text-emerald-100/90">そのままお待ちください</p>
          </div>
        )}

        {phase === 'success' && (
          <div className="rounded-2xl bg-white px-6 py-10 text-center text-emerald-900 shadow-2xl">
            <p className="text-2xl font-bold">【{purposeLabel(successPurpose)}】打刻は完了しました</p>
            <p className="mt-3 text-base text-emerald-800/90">お疲れさまです。画面を閉じて構いません。</p>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/top'
              }}
              className="mt-8 min-h-14 w-full rounded-xl bg-emerald-600 text-lg font-bold text-white"
            >
              ポータルへ戻る
            </button>
          </div>
        )}

        {phase === 'error' && errorMessage && (
          <div className="rounded-2xl bg-red-950/40 px-5 py-8 text-center">
            <p className="text-lg font-bold text-red-100">打刻できませんでした</p>
            <p className="mt-3 text-sm text-red-50/95">{errorMessage}</p>
            {errorDebug && (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-black/30 px-3 py-3 text-left text-[11px] leading-[1.4] text-red-100/90">
                {errorDebug}
              </pre>
            )}
            <button
              type="button"
              onClick={resetFlow}
              className="mt-8 min-h-14 w-full rounded-xl bg-white text-lg font-bold text-emerald-900"
            >
              やり直す
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
