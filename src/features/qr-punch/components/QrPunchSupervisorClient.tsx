'use client'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { bulkConfirmPendingScans, confirmScanResult, invokeQrCreateSession } from '../actions'

type QrPurpose = 'punch_in' | 'punch_out'
type ScanRow = Database['public']['Tables']['qr_session_scans']['Row']

type ScanView = ScanRow & { employee_name: string }

function locationStatus(scan: ScanRow): string {
  if (scan.result === 'accepted' && scan.confirm_method === 'auto') {
    return '自動承認（位置範囲内）'
  }
  if (scan.result === 'accepted' && scan.confirm_method === 'supervisor_tap') {
    return '承認済（手動）'
  }
  if (scan.result === 'rejected') {
    return '却下'
  }
  if (scan.result === 'pending') {
    return '保留（位置または手動確認）'
  }
  return scan.result ?? '—'
}

export function QrPunchSupervisorClient() {
  const supabase = useMemo(() => createClient(), [])
  const [purpose, setPurpose] = useState<QrPurpose>('punch_in')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [countdownSec, setCountdownSec] = useState<number>(0)
  const [scans, setScans] = useState<ScanView[]>([])
  const [loadingQr, setLoadingQr] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [qrSize, setQrSize] = useState(260)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    const w = typeof window !== 'undefined' ? Math.min(280, window.innerWidth - 80) : 260
    setQrSize(Math.max(200, w))
  }, [])

  const theme = purpose === 'punch_in' ? 'in' : 'out'
  const shellClass =
    theme === 'in'
      ? 'bg-gradient-to-b from-blue-600 to-blue-900 text-white'
      : 'bg-gradient-to-b from-orange-500 to-orange-900 text-white'

  const enrichScans = useCallback(
    async (rows: ScanRow[]): Promise<ScanView[]> => {
      const userIds = [...new Set(rows.map((r) => r.employee_user_id))]
      if (userIds.length === 0) return []
      const { data: emps } = await supabase.from('employees').select('user_id, name').in('user_id', userIds)
      const nameByUser = new Map<string, string>()
      for (const e of emps ?? []) {
        if (e.user_id) nameByUser.set(e.user_id, e.name?.trim() || '（名前なし）')
      }
      return rows.map((r) => ({
        ...r,
        employee_name: nameByUser.get(r.employee_user_id) ?? '（不明）',
      }))
    },
    [supabase],
  )

  const loadScans = useCallback(
    async (sid: string) => {
      const { data, error: qErr } = await supabase
        .from('qr_session_scans')
        .select('*')
        .eq('session_id', sid)
        .order('scanned_at', { ascending: false })
      if (qErr) {
        console.error(qErr)
        return
      }
      const enriched = await enrichScans((data ?? []) as ScanRow[])
      setScans(enriched)
    },
    [supabase, enrichScans],
  )

  const mergeScanPayload = useCallback(
    async (row: ScanRow) => {
      const [one] = await enrichScans([row])
      if (!one) return
      setScans((prev) => {
        const idx = prev.findIndex((s) => s.id === one.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = one
          return next
        }
        return [one, ...prev]
      })
    },
    [enrichScans],
  )

  useEffect(() => {
    if (!expiresAt) {
      setCountdownSec(0)
      return
    }
    const tick = () => {
      const end = new Date(expiresAt).getTime()
      const sec = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setCountdownSec(sec)
    }
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [expiresAt])

  useEffect(() => {
    if (!sessionId) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const ch = supabase
      .channel(`qr-scans-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'qr_session_scans',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          void mergeScanPayload(payload.new as ScanRow)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'qr_session_scans',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          void mergeScanPayload(payload.new as ScanRow)
        },
      )
      .subscribe()

    channelRef.current = ch
    return () => {
      void supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [sessionId, supabase, mergeScanPayload])

  const createQrSession = async () => {
    setError(null)
    setLoadingQr(true)
    try {
      const result = await invokeQrCreateSession(purpose)
      if (result.ok === false) {
        setError(result.message || 'QR セッションの作成に失敗しました')
        return
      }

      setError(null)
      setSessionId(result.sessionId)
      setExpiresAt(result.expiresAt)
      setToken(result.token)
      setScans([])
      await loadScans(result.sessionId)
    } catch (e) {
      setError(e instanceof Error ? e.message : '通信エラー')
    } finally {
      setLoadingQr(false)
    }
  }

  const pendingScans = useMemo(() => scans.filter((s) => s.result === 'pending'), [scans])

  const handleConfirmOne = (scanId: string, result: 'accepted' | 'rejected') => {
    startTransition(async () => {
      const r = await confirmScanResult(scanId, result)
      if (r.ok === false) {
        setError(r.message)
        return
      }
      setError(null)
      if (sessionId) await loadScans(sessionId)
    })
  }

  const handleBulk = (result: 'accepted' | 'rejected') => {
    const ids = pendingScans.map((s) => s.id)
    if (ids.length === 0) return
    startTransition(async () => {
      const r = await bulkConfirmPendingScans(ids, result)
      if (r.ok === false) {
        setError(r.message)
        return
      }
      setError(null)
      if (sessionId) await loadScans(sessionId)
    })
  }

  const expired = countdownSec <= 0 && !!expiresAt

  return (
    <div className={`min-h-screen ${shellClass}`}>
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6 pb-28">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight drop-shadow-sm">QR 打刻（監督者）</h1>
          <p className="mt-1 text-sm text-white/85">現場で QR を表示し、スキャンを確認・承認します</p>
        </header>

        {/* 出勤 / 退勤 */}
        <div
          className={`grid grid-cols-2 gap-3 rounded-2xl p-1.5 ${theme === 'in' ? 'bg-blue-950/40' : 'bg-orange-950/40'}`}
        >
          <button
            type="button"
            onClick={() => setPurpose('punch_in')}
            className={`min-h-14 rounded-xl text-lg font-bold transition ${
              purpose === 'punch_in'
                ? 'bg-white text-blue-700 shadow-lg'
                : 'bg-transparent text-white/80 hover:bg-white/10'
            }`}
          >
            出勤
          </button>
          <button
            type="button"
            onClick={() => setPurpose('punch_out')}
            className={`min-h-14 rounded-xl text-lg font-bold transition ${
              purpose === 'punch_out'
                ? 'bg-white text-orange-700 shadow-lg'
                : 'bg-transparent text-white/80 hover:bg-white/10'
            }`}
          >
            退勤
          </button>
        </div>

        <button
          type="button"
          onClick={() => void createQrSession()}
          disabled={loadingQr}
          className={`min-h-16 w-full rounded-2xl text-xl font-bold shadow-xl transition active:scale-[0.98] disabled:opacity-60 ${
            theme === 'in'
              ? 'bg-white text-blue-700 hover:bg-blue-50'
              : 'bg-white text-orange-800 hover:bg-orange-50'
          }`}
        >
          {loadingQr ? '生成中…' : 'QRコードを生成'}
        </button>

        {error && (
          <div
            className="rounded-xl border border-white/30 bg-black/25 px-4 py-3 text-center text-sm font-medium text-amber-100"
            role="alert"
          >
            {error}
          </div>
        )}

        {token && !expired && pendingScans.length === 0 && (
          <div className="rounded-2xl bg-white p-4 text-center text-slate-900 shadow-2xl">
            <div className="flex justify-center py-2">
              <QRCodeSVG value={token} size={qrSize} level="M" includeMargin />
            </div>
            <p className="mt-3 text-xs text-slate-500">従業員アプリでこの QR をスキャンしてください</p>
            <div
              className={`mt-4 rounded-xl py-4 text-3xl font-mono font-bold tabular-nums ${
                countdownSec <= 15 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-800'
              }`}
            >
              残り {countdownSec} 秒
            </div>
          </div>
        )}

        {token && expired && pendingScans.length === 0 && (
          <div className="rounded-2xl border border-white/40 bg-black/20 px-4 py-6 text-center text-lg font-semibold">
            QR の有効期限が切れました。必要なら再生成してください。
          </div>
        )}

        <section className="rounded-2xl bg-black/20 p-4 backdrop-blur-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">スキャン待ち（保留）</h2>
            <button
              type="button"
              disabled={pendingScans.length === 0 || isPending}
              onClick={() => handleBulk('accepted')}
              className="min-h-11 min-w-32 rounded-xl bg-emerald-500 px-4 text-base font-bold text-white shadow-md disabled:opacity-40"
            >
              一括承認
            </button>
          </div>

          {pendingScans.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/75">保留中のスキャンはありません</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pendingScans.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-white/20 bg-white/10 p-3 text-left shadow-inner"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-bold">{s.employee_name}</p>
                      <p className="text-sm text-white/80">
                        {format(new Date(s.scanned_at), 'M/d HH:mm:ss', { locale: ja })}
                      </p>
                      <p className="mt-1 text-sm text-white/90">{locationStatus(s)}</p>
                    </div>
                    <div className="mt-2 flex shrink-0 gap-2 sm:mt-0">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleConfirmOne(s.id, 'accepted')}
                        className="min-h-11 flex-1 rounded-lg bg-emerald-500 px-3 text-sm font-bold text-white sm:flex-none"
                      >
                        承認
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleConfirmOne(s.id, 'rejected')}
                        className="min-h-11 flex-1 rounded-lg bg-red-600/90 px-3 text-sm font-bold text-white sm:flex-none"
                      >
                        却下
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {scans.some((s) => s.result !== 'pending') && (
          <section className="rounded-2xl bg-black/15 p-4 text-sm text-white/85">
            <h3 className="mb-2 font-bold text-white">最近の処理済み</h3>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {scans
                .filter((s) => s.result !== 'pending')
                .slice(0, 12)
                .map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 border-b border-white/10 py-1">
                    <span className="font-medium">{s.employee_name}</span>
                    <span className="text-white/70">
                      {s.result} · {format(new Date(s.scanned_at), 'HH:mm:ss')}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
