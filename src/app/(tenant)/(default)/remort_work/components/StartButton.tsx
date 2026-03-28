'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { invokeEdgeWithSession } from '@/lib/supabase/invoke-edge-with-session'
import { toJSTISOString } from '@/lib/datetime'
import { getOrCreateDeviceIdentifier } from '@/lib/telework/device-storage'
import { APP_ROUTES } from '@/config/routes'
import { userMessageFromTeleworkEdgeCode } from '@/features/telework/map-telework-edge-error'

function dispatchSessionsChanged() {
  window.dispatchEvent(new Event('telework:sessions-changed'))
}

type DeviceGate =
  | { status: 'loading' }
  | {
      status: 'ready'
      deviceName: string | null
      deviceIdentifier: string
    }
  | { status: 'blocked'; message: string; showPairingLink?: boolean }

export default function StartButton() {
  const [gate, setGate] = useState<DeviceGate>({ status: 'loading' })
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const deviceIdentifier = getOrCreateDeviceIdentifier()
      if (!deviceIdentifier) {
        if (!cancelled) {
          setGate({
            status: 'blocked',
            message: '端末識別子を取得できませんでした。',
          })
        }
        return
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) {
        if (!cancelled) {
          setGate({
            status: 'blocked',
            message: 'ログインが必要です。',
          })
        }
        return
      }

      const { data, error } = await supabase
        .from('telework_pc_devices')
        .select('device_name, approved, rejected_at')
        .eq('user_id', user.id)
        .eq('device_identifier', deviceIdentifier)
        .maybeSingle()

      if (cancelled) return

      if (error || !data) {
        setGate({
          status: 'blocked',
          message:
            'このブラウザではまだ承認済み端末として登録されていません。端末登録と人事承認を行ってください。',
          showPairingLink: true,
        })
        return
      }

      if (data.rejected_at) {
        setGate({
          status: 'blocked',
          message: 'この端末の登録は却下されています。必要であれば再申請してください。',
          showPairingLink: true,
        })
        return
      }

      if (!data.approved) {
        setGate({
          status: 'blocked',
          message:
            '端末の承認待ちです。人事による承認後に作業を開始できます。',
        })
        return
      }

      setGate({
        status: 'ready',
        deviceName: data.device_name,
        deviceIdentifier,
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const onStart = useCallback(async () => {
    if (gate.status !== 'ready') return
    setMessage(null)
    setStarting(true)
    try {
      const supabase = createClient()

      let lat: number | undefined
      let lon: number | undefined
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude
              lon = pos.coords.longitude
              resolve()
            },
            () => resolve(),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
          )
        })
      }

      const userAgent =
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined

      const body = {
        device_identifier: gate.deviceIdentifier,
        timestamp: toJSTISOString(),
        ...(lat !== undefined && { lat }),
        ...(lon !== undefined && { lon }),
        ...(userAgent && { user_agent: userAgent }),
      }

      const { data, error } = await invokeEdgeWithSession<{
        session_id?: string
        error?: string
      }>(supabase, 'telework-start', { body })

      if (error) {
        setMessage(error.message)
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setMessage(userMessageFromTeleworkEdgeCode(String(data.error)))
        return
      }
      if (data?.session_id) {
        setMessage(`作業を開始しました（セッション記録済み）`)
        dispatchSessionsChanged()
        return
      }
      setMessage('開始に失敗しました。')
    } finally {
      setStarting(false)
    }
  }, [gate])

  if (gate.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin shrink-0" />
        端末を確認しています…
      </div>
    )
  }

  if (gate.status === 'blocked') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {gate.message}
        </p>
        {gate.showPairingLink ? (
          <p className="text-sm">
            <Link
              href={APP_ROUTES.TENANT.PORTAL_DEVICE_PAIRING}
              className="text-indigo-600 font-medium underline hover:text-indigo-800"
            >
              端末登録（テレワーク用）
            </Link>
            へ進む
          </p>
        ) : null}
      </div>
    )
  }

  const namePart = gate.deviceName?.trim() || '（名称未設定）'

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900">
        端末名：{namePart}
      </p>

      <button
        type="button"
        onClick={onStart}
        disabled={starting}
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {starting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Play className="w-5 h-5" />
        )}
        作業を開始する
      </button>

      {message && (
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{message}</p>
      )}
    </div>
  )
}
