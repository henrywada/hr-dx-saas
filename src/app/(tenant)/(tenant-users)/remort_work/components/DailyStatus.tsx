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

/** 1 日 1 行表示用: 複数行（移行前データ）をまとめて 1 件分に集約 */
function aggregateSessionsForDay(rows: SessionRow[]): SessionRow | null {
  if (rows.length === 0) return null
  if (rows.length === 1) return rows[0]!

  const byStart = [...rows].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
  )
  const first = byStart[0]!
  const openRow = rows.find((r) => r.status === 'open' && !r.end_at)
  const closedWithEnd = rows.filter((r) => r.end_at)

  if (openRow) {
    return {
      id: openRow.id,
      start_at: first.start_at,
      end_at: null,
      worked_seconds: null,
      status: 'open',
    }
  }

  let latestEnd: string | null = null
  let latestEndMs = -Infinity
  for (const r of closedWithEnd) {
    const t = new Date(r.end_at!).getTime()
    if (t >= latestEndMs) {
      latestEndMs = t
      latestEnd = r.end_at
    }
  }

  let totalWorked = 0
  for (const r of rows) {
    if (r.worked_seconds != null) totalWorked += r.worked_seconds
  }

  return {
    id: byStart[byStart.length - 1]!.id,
    start_at: first.start_at,
    end_at: latestEnd,
    worked_seconds: totalWorked > 0 ? totalWorked : null,
    status: 'closed',
  }
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

  const aggregated =
    rows.length > 0 ? aggregateSessionsForDay(rows) : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">本日のテレワーク状況</h2>
          <p className="text-xs text-slate-500">JST {dayYmd}（1 日 1 回）</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          読み込み中…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !aggregated ? (
        <p className="text-sm text-slate-600">本日のセッションはまだありません。</p>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-slate-500 block text-xs mb-0.5">開始</span>
              <span className="font-medium text-slate-900">
                {formatDateTimeInJST(aggregated.start_at)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs mb-0.5">終了</span>
              <span className="font-medium text-slate-900">
                {aggregated.end_at
                  ? formatDateTimeInJST(aggregated.end_at)
                  : '—（進行中）'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs mb-0.5">稼働時間</span>
              <span className="font-medium text-slate-900">
                {formatDuration(aggregated.worked_seconds)}
              </span>
            </div>
          </div>
          {aggregated.status === 'open' && !aggregated.end_at && (
            <p className="text-xs text-amber-700">ステータス: 作業中</p>
          )}
          {rows.length > 1 ? (
            <p className="text-xs text-slate-500 pt-1">
              ※過去データにより同日に複数行があります。表示は 1 日分に集約しています。
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
