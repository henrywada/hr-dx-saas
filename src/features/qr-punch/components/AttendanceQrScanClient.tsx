'use client'

import { createClient } from '@/lib/supabase/client'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { invokeQrScan } from '../actions'

type Phase =
  | 'idle'
  | 'scanning'
  | 'sending'
  | 'success'
  | 'pending_wait'
  | 'rejected'
  | 'error'

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

export function AttendanceQrScanClient() {
  const supabase = createClient()
  const [phase, setPhase] = useState<Phase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rejectHint, setRejectHint] = useState<string | null>(null)
  const [watchScanId, setWatchScanId] = useState<string | null>(null)
  const processingRef = useRef(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const resetFlow = useCallback(() => {
    processingRef.current = false
    setErrorMessage(null)
    setRejectHint(null)
    setWatchScanId(null)
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setPhase('idle')
  }, [supabase])

  const finalizeFromResult = useCallback((result: string | null) => {
    if (result === 'accepted') {
      setPhase('success')
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }
    if (result === 'rejected') {
      setRejectHint(
        '上司により打刻が却下されました。位置情報や現場ルールを確認し、必要なら所属へ連絡してください。',
      )
      setPhase('rejected')
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabase])

  useEffect(() => {
    if (!watchScanId || phase !== 'pending_wait') return

    const ch = supabase
      .channel(`employee-scan-${watchScanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'qr_session_scans',
          filter: `id=eq.${watchScanId}`,
        },
        (payload) => {
          const row = payload.new as { result?: string | null }
          finalizeFromResult(row.result ?? null)
        },
      )
      .subscribe()

    channelRef.current = ch
    return () => {
      void supabase.removeChannel(ch)
      if (channelRef.current === ch) channelRef.current = null
    }
  }, [watchScanId, phase, supabase, finalizeFromResult])

  // Realtime が届かない場合のフォールバック
  useEffect(() => {
    if (phase !== 'pending_wait' || !watchScanId) return
    const sid = watchScanId
    const tick = async () => {
      const { data } = await supabase.from('qr_session_scans').select('result').eq('id', sid).maybeSingle()
      const r = data?.result
      if (r && r !== 'pending') finalizeFromResult(r)
    }
    const id = setInterval(() => void tick(), 8000)
    void tick()
    return () => clearInterval(id)
  }, [phase, watchScanId, supabase, finalizeFromResult])

  const runScanPipeline = useCallback(
    async (rawToken: string) => {
      const token = rawToken.trim()
      if (!token) {
        setErrorMessage('QRからデータを読み取れませんでした。')
        setPhase('error')
        processingRef.current = false
        return
      }

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
        setPhase('error')
        processingRef.current = false
        return
      }

      const scanId = scanResult.scanId
      const result = scanResult.result

      if (result === 'accepted') {
        setPhase('success')
        processingRef.current = false
        return
      }

      if (result === 'pending') {
        setWatchScanId(scanId)
        setPhase('pending_wait')
        processingRef.current = false
        return
      }

      if (result === 'rejected') {
        setRejectHint('打刻が却下されています。所属へ確認してください。')
        setPhase('rejected')
        processingRef.current = false
        return
      }

      setPhase('success')
      processingRef.current = false
    },
    [supabase],
  )

  const onDecodedRef = useRef<(text: string) => void>(() => {})
  onDecodedRef.current = (decodedText: string) => {
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
      await runScanPipeline(decodedText)
    })()
  }

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

    scanner.render(
      (text) => onDecodedRef.current(text),
      () => {},
    )

    return () => {
      void scanner.clear().catch(() => {})
      if (scannerRef.current === scanner) scannerRef.current = null
    }
  }, [phase])

  const secure = typeof window !== 'undefined' && window.isSecureContext

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-700 to-emerald-950 text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6 pb-24">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">QR 打刻（従業員）</h1>
          <p className="mt-1 text-sm text-emerald-100">上司の QR を読み取って出退勤を記録します</p>
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
              setRejectHint(null)
              setWatchScanId(null)
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

        {phase === 'sending' && (
          <div className="rounded-2xl bg-black/30 px-6 py-10 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p className="text-lg font-bold">位置を確認して打刻しています…</p>
            <p className="mt-2 text-sm text-emerald-100/90">そのままお待ちください</p>
          </div>
        )}

        {phase === 'success' && (
          <div className="rounded-2xl bg-white px-6 py-10 text-center text-emerald-900 shadow-2xl">
            <p className="text-3xl font-bold">打刻完了</p>
            <p className="mt-3 text-base text-emerald-800/90">お疲れさまです。画面を閉じて構いません。</p>
            <button
              type="button"
              onClick={resetFlow}
              className="mt-8 min-h-14 w-full rounded-xl bg-emerald-600 text-lg font-bold text-white"
            >
              続けてスキャンする
            </button>
          </div>
        )}

        {phase === 'pending_wait' && (
          <div className="rounded-2xl bg-black/30 px-5 py-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-amber-400/80" />
            <p className="text-xl font-bold">上司の承認を待っています…</p>
            <p className="mt-3 text-sm text-emerald-100/90">
              承認が完了すると、この画面が自動で切り替わります。しばらくそのままお待ちください。
            </p>
            <button
              type="button"
              onClick={resetFlow}
              className="mt-8 min-h-12 w-full rounded-xl border border-white/40 text-base font-semibold text-white/90"
            >
              中断してトップに戻る
            </button>
          </div>
        )}

        {phase === 'rejected' && (
          <div className="rounded-2xl bg-red-950/50 px-5 py-8 text-center ring-2 ring-red-400/50">
            <p className="text-2xl font-bold text-red-100">打刻が却下されました</p>
            <p className="mt-3 text-sm text-red-100/90">{rejectHint}</p>
            <button
              type="button"
              onClick={resetFlow}
              className="mt-8 min-h-14 w-full rounded-xl bg-white text-lg font-bold text-red-900"
            >
              閉じる
            </button>
          </div>
        )}

        {phase === 'error' && errorMessage && (
          <div className="rounded-2xl bg-red-950/40 px-5 py-8 text-center">
            <p className="text-lg font-bold text-red-100">打刻できませんでした</p>
            <p className="mt-3 text-sm text-red-50/95">{errorMessage}</p>
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
