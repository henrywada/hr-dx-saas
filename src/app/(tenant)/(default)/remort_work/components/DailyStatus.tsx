'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  formatDateTimeInJST,
  jstDayStartUtcIso,
  jstNextDayStartUtcIso,
  toJSTDateString,
} from '@/lib/datetime'

type SessionRow = {
  id: string
  start_at: string
  end_at: string | null
  worked_seconds: number | null
  status: string | null
}

function formatDuration(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}時間${m}分${s}秒`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

export default function DailyStatus() {
  const [rows, setRows] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dayYmd = toJSTDateString()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setRows([])
        return
      }

      const startIso = jstDayStartUtcIso(dayYmd)
      const endIso = jstNextDayStartUtcIso(dayYmd)

      const { data, error: qErr } = await supabase
        .from('telework_sessions')
        .select('id, start_at, end_at, worked_seconds, status')
        .eq('user_id', user.id)
        .gte('start_at', startIso)
        .lt('start_at', endIso)
        .order('start_at', { ascending: true })

      if (qErr) {
        setError('当日の記録を読み込めませんでした。')
        setRows([])
        return
      }
      setRows((data ?? []) as SessionRow[])
    } finally {
      setLoading(false)
    }
  }, [dayYmd])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onChange = () => void load()
    window.addEventListener('telework:sessions-changed', onChange)
    return () => window.removeEventListener('telework:sessions-changed', onChange)
  }, [load])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">本日のテレワーク状況</h2>
          <p className="text-xs text-slate-500">JST {dayYmd}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          読み込み中…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-600">本日のセッションはまだありません。</p>
      ) : (
        <ul className="space-y-4 divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.id} className="pt-4 first:pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-slate-500 block text-xs mb-0.5">開始</span>
                  <span className="font-medium text-slate-900">
                    {formatDateTimeInJST(r.start_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs mb-0.5">終了</span>
                  <span className="font-medium text-slate-900">
                    {r.end_at ? formatDateTimeInJST(r.end_at) : '—（進行中）'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs mb-0.5">稼働時間</span>
                  <span className="font-medium text-slate-900">
                    {formatDuration(r.worked_seconds)}
                  </span>
                </div>
              </div>
              {r.status === 'open' && !r.end_at && (
                <p className="mt-2 text-xs text-amber-700">ステータス: 作業中</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
