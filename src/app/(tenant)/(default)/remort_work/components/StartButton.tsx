'use client'

import { useCallback, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { invokeEdgeWithSession } from '@/lib/supabase/invoke-edge-with-session'
import { toJSTISOString } from '@/lib/datetime'

export type TeleworkDeviceOption = { id: string; device_name: string | null }

function dispatchSessionsChanged() {
  window.dispatchEvent(new Event('telework:sessions-changed'))
}

type Props = {
  devices: TeleworkDeviceOption[]
}

export default function StartButton({ devices }: Props) {
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onStart = useCallback(async () => {
    setMessage(null)
    if (!deviceId) {
      setMessage('承認済みの端末を選択してください。')
      return
    }

    setLoading(true)
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
        device_id: deviceId,
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
        setMessage(String(data.error))
        return
      }
      if (data?.session_id) {
        setMessage(`作業を開始しました（セッション記録済み）`)
        dispatchSessionsChanged()
        return
      }
      setMessage('開始に失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [deviceId])

  if (devices.length === 0) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        承認済みのテレワーク用端末がありません。管理者による端末登録・承認後にご利用ください。
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        使用する端末
        <select
          className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          disabled={loading}
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.device_name?.trim() || '端末（名称未設定）'}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onStart}
        disabled={loading || !deviceId}
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {loading ? (
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
