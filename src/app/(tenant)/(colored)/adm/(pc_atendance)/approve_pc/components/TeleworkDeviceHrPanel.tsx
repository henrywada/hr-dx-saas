'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { messageFromFunctionsInvokeError } from '@/features/qr-punch/parse-functions-error'
import { userMessageFromTeleworkEdgeCode } from '@/features/telework/map-telework-edge-error'
import { createClient } from '@/lib/supabase/client'
import { invokeEdgeWithSession } from '@/lib/supabase/invoke-edge-with-session'

type PendingRow = {
  id: string
  user_id: string
  device_name: string | null
  device_identifier: string | null
  registered_at: string | null
}

type ApprovedRow = {
  id: string
  user_id: string
  device_name: string | null
  device_identifier: string | null
  registered_at: string | null
  approved_at: string | null
  approved_by: string | null
}

function formatUserLabel(
  userId: string,
  nameByUserId: Map<string, string | null>,
): string {
  const n = nameByUserId.get(userId)?.trim()
  if (n) return `${n}（${userId.slice(0, 8)}…）`
  return userId.slice(0, 8) + '…'
}

export default function TeleworkDeviceHrPanel() {
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([])
  const [approvedRows, setApprovedRows] = useState<ApprovedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [nameByUserId, setNameByUserId] = useState<Map<string, string | null>>(
    () => new Map(),
  )

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const supabase = createClient()
      const [pendingRes, approvedRes] = await Promise.all([
        supabase
          .from('telework_pc_devices')
          .select(
            'id, user_id, device_name, device_identifier, registered_at',
          )
          .eq('approved', false)
          .is('rejected_at', null)
          .order('registered_at', { ascending: false }),
        supabase
          .from('telework_pc_devices')
          .select(
            'id, user_id, device_name, device_identifier, registered_at, approved_at, approved_by',
          )
          .eq('approved', true)
          .order('approved_at', { ascending: false }),
      ])

      if (pendingRes.error || approvedRes.error) {
        setLoadError('一覧の取得に失敗しました。')
        setPendingRows([])
        setApprovedRows([])
        setNameByUserId(new Map())
        return
      }

      const pending = (pendingRes.data ?? []) as PendingRow[]
      const approved = (approvedRes.data ?? []) as ApprovedRow[]
      setPendingRows(pending)
      setApprovedRows(approved)

      const idSet = new Set<string>()
      for (const r of pending) idSet.add(r.user_id)
      for (const r of approved) {
        idSet.add(r.user_id)
        if (r.approved_by) idSet.add(r.approved_by)
      }
      const ids = [...idSet]
      if (ids.length === 0) {
        setNameByUserId(new Map())
        return
      }

      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('user_id, name')
        .in('user_id', ids)

      if (empErr) {
        setNameByUserId(new Map())
        return
      }
      const m = new Map<string, string | null>()
      for (const e of emps ?? []) {
        const row = e as { user_id: string; name: string | null }
        m.set(row.user_id, row.name)
      }
      setNameByUserId(m)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onApprove = async (deviceId: string) => {
    setBusyId(deviceId)
    setActionError(null)
    try {
      const supabase = createClient()
      const { data, error: invErr } = await invokeEdgeWithSession<{
        ok?: boolean
        error?: string
      }>(supabase, 'telework-device-approve', {
        body: { device_id: deviceId, approve: true },
      })
      if (invErr) {
        const raw = await messageFromFunctionsInvokeError(invErr)
        setActionError(userMessageFromTeleworkEdgeCode(raw))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setActionError(userMessageFromTeleworkEdgeCode(String(data.error)))
        return
      }
      setActionError(null)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const onReject = async (deviceId: string) => {
    const reason = window.prompt('拒否理由（任意）') ?? ''
    setBusyId(deviceId)
    setActionError(null)
    try {
      const supabase = createClient()
      const { data, error: invErr } = await invokeEdgeWithSession<{
        ok?: boolean
        error?: string
      }>(supabase, 'telework-device-approve', {
        body: {
          device_id: deviceId,
          approve: false,
          rejection_reason: reason.trim() || null,
        },
      })
      if (invErr) {
        const raw = await messageFromFunctionsInvokeError(invErr)
        setActionError(userMessageFromTeleworkEdgeCode(raw))
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setActionError(userMessageFromTeleworkEdgeCode(String(data.error)))
        return
      }
      setActionError(null)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm py-8">
        <Loader2 className="w-4 h-4 animate-spin" />
        読み込み中…
      </div>
    )
  }

  if (loadError) {
    return <p className="text-sm text-red-600 py-2">{loadError}</p>
  }

  return (
    <div className="space-y-8">
      {actionError ? (
        <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          {actionError}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">承認待ち</h2>
        {pendingRows.length === 0 ? (
          <p className="text-sm text-slate-600 py-2">
            承認待ちの端末はありません。
          </p>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {pendingRows.map((r) => (
                <li
                  key={r.id}
                  className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1 text-sm min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {r.device_name || '（名称なし）'}
                    </p>
                    <p className="text-xs text-slate-500 font-mono break-all">
                      ID: {r.id}
                    </p>
                    <p className="text-xs text-slate-500 font-mono break-all">
                      識別子: {r.device_identifier ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400">
                      利用者:{' '}
                      {formatUserLabel(r.user_id, nameByUserId)} / 申請:{' '}
                      {r.registered_at
                        ? new Date(r.registered_at).toLocaleString('ja-JP')
                        : '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void onApprove(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {busyId === r.id ? '処理中…' : '承認'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void onReject(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ShieldOff className="w-4 h-4" />
                      拒否
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">承認済み</h2>
        {approvedRows.length === 0 ? (
          <p className="text-sm text-slate-600 py-2">
            承認済みの端末はまだありません。
          </p>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {approvedRows.map((r) => (
                <li key={r.id} className="px-4 py-4 text-sm min-w-0">
                  <p className="font-medium text-slate-900 truncate mb-3">
                    {r.device_name || '（名称なし）'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <div className="space-y-2 min-w-0">
                      <p className="text-xs text-slate-500 font-mono break-all">
                        ID: {r.id}
                      </p>
                      <p className="text-xs text-slate-500 font-mono break-all">
                        識別子: {r.device_identifier ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400">
                        利用者: {formatUserLabel(r.user_id, nameByUserId)}
                      </p>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <p className="text-xs text-slate-500">
                        承認日時:{' '}
                        {r.approved_at
                          ? new Date(r.approved_at).toLocaleString('ja-JP')
                          : '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        承認者:{' '}
                        {r.approved_by
                          ? formatUserLabel(r.approved_by, nameByUserId)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  )
}
