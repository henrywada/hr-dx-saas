'use client'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { getJstDateRangeUtc } from '@/features/qr-punch/jst-date-range'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { QRCodeSVG } from 'qrcode.react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invokeQrCreateSession, type QrPunchPurpose } from '../actions'
import { QrPunchMobileTipsModalTrigger } from './QrPunchMobileTipsModal'

type ScanRow = Database['public']['Tables']['qr_session_scans']['Row']

type TodayPunchRow = {
  id: string
  scanned_at: string
  employee_user_id: string
  purpose: QrPunchPurpose
  employee_name: string
}

function purposeLabel(p: QrPunchPurpose): string {
  return p === 'punch_in' ? '出勤' : '退勤'
}

export function QrPunchSupervisorClient() {
  const supabase = useMemo(() => createClient(), [])
  const [purpose, setPurpose] = useState<QrPunchPurpose>('punch_in')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  /** サーバが返すセッション失効時刻（自動 QR 更新のスケジュール用） */
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [todayList, setTodayList] = useState<TodayPunchRow[]>([])
  const [loadingQr, setLoadingQr] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrSize, setQrSize] = useState(260)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const supervisorUserIdRef = useRef<string | null>(null)
  const purposeRef = useRef(purpose)
  /** スキャン通知と期限タイマーが同時に走ったときの二重生成を防ぐ */
  const qrRefreshInFlightRef = useRef(false)

  useEffect(() => {
    purposeRef.current = purpose
  }, [purpose])

  /** 出勤↔退勤を切り替えたときは QR を消し、「QRコードを生成」から出し直させる */
  const handlePurposeChange = useCallback((p: QrPunchPurpose) => {
    if (p === purpose) return
    setPurpose(p)
    setSessionId(null)
    setToken(null)
    setExpiresAt(null)
    setError(null)
    setRegenerating(false)
  }, [purpose])

  useEffect(() => {
    const w = typeof window !== 'undefined' ? Math.min(280, window.innerWidth - 80) : 260
    setQrSize(Math.max(200, w))
  }, [])

  const theme = purpose === 'punch_in' ? 'in' : 'out'
  const shellClass =
    theme === 'in'
      ? 'bg-gradient-to-b from-blue-600 to-blue-900 text-white'
      : 'bg-gradient-to-b from-orange-500 to-orange-900 text-white'

  const enrichTodayRows = useCallback(
    async (
      rows: { id: string; scanned_at: string; employee_user_id: string; qr_sessions: { purpose: string } | null }[],
    ): Promise<TodayPunchRow[]> => {
      const userIds = [...new Set(rows.map((r) => r.employee_user_id))]
      if (userIds.length === 0) return []
      const { data: emps } = await supabase.from('employees').select('user_id, name').in('user_id', userIds)
      const nameByUser = new Map<string, string>()
      for (const e of emps ?? []) {
        if (e.user_id) nameByUser.set(e.user_id, e.name?.trim() || '（名前なし）')
      }
      return rows.map((r) => ({
        id: r.id,
        scanned_at: r.scanned_at,
        employee_user_id: r.employee_user_id,
        purpose: (r.qr_sessions?.purpose === 'punch_out' ? 'punch_out' : 'punch_in') as QrPunchPurpose,
        employee_name: nameByUser.get(r.employee_user_id) ?? '（不明）',
      }))
    },
    [supabase],
  )

  const loadTodayPunches = useCallback(async () => {
    const uid = supervisorUserIdRef.current
    if (!uid) return
    const { startIso, endIsoExclusive } = getJstDateRangeUtc()
    const { data, error: qErr } = await supabase
      .from('qr_session_scans')
      .select('id, scanned_at, employee_user_id, qr_sessions!inner(supervisor_user_id, purpose)')
      .eq('result', 'accepted')
      .gte('scanned_at', startIso)
      .lt('scanned_at', endIsoExclusive)
      .filter('qr_sessions.supervisor_user_id', 'eq', uid)
      .order('scanned_at', { ascending: false })

    if (qErr) {
      console.error(qErr)
      return
    }
    const raw =
      (data ?? []) as unknown as {
        id: string
        scanned_at: string
        employee_user_id: string
        qr_sessions: { supervisor_user_id: string; purpose: string }
      }[]
    const enriched = await enrichTodayRows(raw)
    setTodayList(enriched)
  }, [supabase, enrichTodayRows])

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      supervisorUserIdRef.current = user?.id ?? null
      void loadTodayPunches()
    })
  }, [supabase, loadTodayPunches])

  const mergeTodayFromScan = useCallback(
    async (row: ScanRow) => {
      if (row.result !== 'accepted') return
      const { data: sess } = await supabase
        .from('qr_sessions')
        .select('supervisor_user_id, purpose')
        .eq('id', row.session_id)
        .maybeSingle()
      const supId = supervisorUserIdRef.current
      if (!sess || sess.supervisor_user_id !== supId) return
      const { startIso, endIsoExclusive } = getJstDateRangeUtc()
      const t = new Date(row.scanned_at).getTime()
      if (t < new Date(startIso).getTime() || t >= new Date(endIsoExclusive).getTime()) return

      const [one] = await enrichTodayRows([
        {
          id: row.id,
          scanned_at: row.scanned_at,
          employee_user_id: row.employee_user_id,
          qr_sessions: { purpose: sess.purpose ?? 'punch_in' },
        },
      ])
      if (!one) return
      setTodayList((prev) => {
        if (prev.some((p) => p.id === one.id)) {
          return prev.map((p) => (p.id === one.id ? one : p))
        }
        return [one, ...prev].sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
      })
    },
    [supabase, enrichTodayRows],
  )

  const createQrSessionCore = useCallback(async (p: QrPunchPurpose): Promise<{ ok: true } | { ok: false; message: string }> => {
    const result = await invokeQrCreateSession(p)
    if (result.ok === false) {
      return { ok: false, message: result.message || 'QR セッションの作成に失敗しました' }
    }
    setSessionId(result.sessionId)
    setToken(result.token)
    setExpiresAt(result.expiresAt)
    return { ok: true }
  }, [])

  /** 従業員スキャン後・有効期限切れ時など、同じモードで QR を作り直す */
  const refreshQrForCurrentPurpose = useCallback(async () => {
    if (qrRefreshInFlightRef.current) return
    qrRefreshInFlightRef.current = true
    setRegenerating(true)
    setToken(null)
    try {
      const r = await createQrSessionCore(purposeRef.current)
      if (r.ok === false) {
        setError(r.message)
        setSessionId(null)
        setExpiresAt(null)
        return
      }
      setError(null)
      await loadTodayPunches()
    } finally {
      qrRefreshInFlightRef.current = false
      setRegenerating(false)
    }
  }, [createQrSessionCore, loadTodayPunches])

  const loadTodayPunchesRef = useRef(loadTodayPunches)
  loadTodayPunchesRef.current = loadTodayPunches
  const mergeTodayFromScanRef = useRef(mergeTodayFromScan)
  mergeTodayFromScanRef.current = mergeTodayFromScan
  const refreshQrForCurrentPurposeRef = useRef(refreshQrForCurrentPurpose)
  refreshQrForCurrentPurposeRef.current = refreshQrForCurrentPurpose

  /** 有効期限到来で自動更新（タブが非表示のときはタイマーが遅延しうるため visibility でも補完） */
  useEffect(() => {
    if (!expiresAt || !sessionId || regenerating || loadingQr) return
    const deadline = new Date(expiresAt).getTime()
    const ms = deadline - Date.now()
    const run = () => void refreshQrForCurrentPurposeRef.current()
    if (ms <= 0) {
      run()
      return
    }
    const id = window.setTimeout(run, ms)
    return () => window.clearTimeout(id)
  }, [expiresAt, sessionId, regenerating, loadingQr])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      if (regenerating || loadingQr) return
      if (!expiresAt || !sessionId) return
      if (new Date(expiresAt).getTime() <= Date.now()) {
        void refreshQrForCurrentPurposeRef.current()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [expiresAt, sessionId, regenerating, loadingQr])

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
          const row = payload.new as ScanRow
          void mergeTodayFromScanRef.current(row)
          void refreshQrForCurrentPurposeRef.current()
        },
      )
      .subscribe()

    channelRef.current = ch
    return () => {
      void supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [sessionId, supabase])

  const createQrSession = async () => {
    setError(null)
    setLoadingQr(true)
    try {
      const r = await createQrSessionCore(purpose)
      if (r.ok === false) {
        setError(r.message)
        return
      }
      setError(null)
      await loadTodayPunches()
    } catch (e) {
      setError(e instanceof Error ? e.message : '通信エラー')
    } finally {
      setLoadingQr(false)
    }
  }

  const secure = typeof window !== 'undefined' && window.isSecureContext

  return (
    <div className={`min-h-screen ${shellClass}`}>
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6 pb-28">
        <header>
          <div className="flex items-start justify-between gap-3">
            <QrPunchMobileTipsModalTrigger />
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold tracking-tight drop-shadow-sm">QR 打刻（監督者）</h1>
              <p className="mt-1 text-sm text-white/85">現場で QR を表示し、従業員の打刻を受け付けます</p>
              <p className="mt-2 text-xs leading-snug text-white/65">
                QR の有効期限は約 5 分です。期限が切れると自動で新しい QR に差し替わります。
              </p>
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
          <div className="rounded-xl border border-amber-300/50 bg-black/20 px-3 py-2 text-center text-xs text-amber-100">
            この画面は <strong>HTTPS</strong> または localhost で開くことを推奨します。
          </div>
        )}

        <div
          className={`grid grid-cols-2 gap-3 rounded-2xl p-1.5 ${theme === 'in' ? 'bg-blue-950/40' : 'bg-orange-950/40'}`}
        >
          <button
            type="button"
            onClick={() => handlePurposeChange('punch_in')}
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
            onClick={() => handlePurposeChange('punch_out')}
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
          disabled={loadingQr || regenerating}
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

        {token && !regenerating && (
          <div className="rounded-2xl bg-white p-4 text-center text-slate-900 shadow-2xl">
            <div className="flex justify-center py-2">
              <QRCodeSVG value={token} size={qrSize} level="M" includeMargin />
            </div>
            <p className="mt-3 text-xs text-slate-500">従業員がこの QR をスキャンすると打刻されます</p>
          </div>
        )}

        {regenerating && (
          <div className="rounded-2xl border border-white/30 bg-black/25 px-4 py-8 text-center text-sm font-medium text-white">
            次の打刻用に QR を再生成しています…
          </div>
        )}

        <section className="rounded-2xl bg-black/20 p-4 backdrop-blur-sm">
          <h2 className="mb-3 text-lg font-bold">打刻済リスト（本日）</h2>
          <p className="mb-3 text-xs text-white/70">出退勤区分・氏名・日時（新しい順）</p>
          {todayList.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/75">本日の打刻はまだありません</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayList.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[4.5rem_1fr_auto] gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm"
                >
                  <span className="font-bold text-white">{purposeLabel(row.purpose)}</span>
                  <span className="truncate font-medium">{row.employee_name}</span>
                  <span className="shrink-0 tabular-nums text-white/85">
                    {format(new Date(row.scanned_at), 'M/d HH:mm:ss', { locale: ja })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
