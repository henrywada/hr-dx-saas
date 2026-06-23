'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Square } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { invokeEdgeWithSession } from '@/lib/supabase/invoke-edge-with-session'
import { toJSTISOString } from '@/lib/datetime'

function dispatchSessionsChanged() {
  window.dispatchEvent(new Event('telework:sessions-changed'))
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}時間${m}分${s}秒`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

export default function EndForm() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadOpen, setLoadOpen] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [lastWorkedSeconds, setLastWorkedSeconds] = useState<number | null>(
    null,
  )

  const refreshOpenSession = useCallback(async () => {
    setLoadOpen(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSessionId(null)
        return
      }
      const { data, error } = await supabase
        .from('telework_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .is('end_at', null)
        .order('start_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        setSessionId(null)
        setMessage('開いているセッションの取得に失敗しました。')
        return
      }
      setSessionId(data?.id ?? null)
    } finally {
      setLoadOpen(false)
    }
  }, [])

  useEffect(() => {
    void refreshOpenSession()
  }, [refreshOpenSession])

  useEffect(() => {
    const onChange = () => void refreshOpenSession()
    window.addEventListener('telework:sessions-changed', onChange)
    return () => window.removeEventListener('telework:sessions-changed', onChange)
  }, [refreshOpenSession])

  const onEnd = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    setMessage(null)
    setLastWorkedSeconds(null)
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

      const body = {
        session_id: sessionId,
        summary_text: summary,
        timestamp: toJSTISOString(),
        ...(lat !== undefined && { lat }),
        ...(lon !== undefined && { lon }),
      }

      const { data, error } = await invokeEdgeWithSession<{
        worked_seconds?: number
        error?: string
      }>(supabase, 'telework-end', { body })

      if (error) {
        setMessage(error.message)
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setMessage(String(data.error))
        return
      }
      if (typeof data?.worked_seconds === 'number') {
        setLastWorkedSeconds(data.worked_seconds)
        setMessage('作業を終了し、記録しました。')
        setSummary('')
        setSessionId(null)
        dispatchSessionsChanged()
        return
      }
      setMessage('終了処理に失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [sessionId, summary])

  if (loadOpen) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        セッションを確認しています…
      </div>
    )
  }

  if (!sessionId) {
    return (
      <p className="text-sm text-slate-600 py-2">
        終了できる作業セッションがありません。先に「作業を開始する」を押してください。
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        今日の作業内容
        <textarea
          className="mt-1 block w-full min-h-[120px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="実施したタスクや成果を簡潔に記入してください"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={loading}
        />
      </label>

      <button
        type="button"
        onClick={onEnd}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] rounded-xl bg-slate-800 px-6 py-3 text-white font-semibold shadow-sm hover:bg-slate-900 disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Square className="w-5 h-5 fill-current" />
        )}
        作業を終了して保存
      </button>

      {lastWorkedSeconds !== null && (
        <p className="text-base font-semibold text-indigo-800">
          記録された稼働時間: {formatDuration(lastWorkedSeconds)}
        </p>
      )}

      {message && (
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{message}</p>
      )}
    </div>
  )
}
