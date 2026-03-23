'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { invokeEdgeWithSession } from '@/lib/supabase/invoke-edge-with-session'

type PendingRow = {
  id: string
  user_id: string
  device_name: string | null
  device_identifier: string | null
  registered_at: string | null
}

export default function DeviceApprovalList() {
  const [rows, setRows] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: qErr } = await supabase
        .from('telework_pc_devices')
        .select('id, user_id, device_name, device_identifier, registered_at')
        .eq('approved', false)
        .is('rejected_at', null)
        .order('registered_at', { ascending: false })

      if (qErr) {
        setError('一覧の取得に失敗しました。')
        setRows([])
        return
      }
      setRows((data ?? []) as PendingRow[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onApprove = async (deviceId: string) => {
    setBusyId(deviceId)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: invErr } = await invokeEdgeWithSession<{
        ok?: boolean
        error?: string
      }>(supabase, 'telework-device-approve', {
        body: { device_id: deviceId, approve: true },
      })
      if (invErr) {
        setError(invErr.message)
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setError(String(data.error))
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const onReject = async (deviceId: string) => {
    const reason = window.prompt('拒否理由（任意）') ?? ''
    setBusyId(deviceId)
    setError(null)
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
        setError(invErr.message)
        return
      }
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        setError(String(data.error))
        return
      }
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

  if (error) {
    return <p className="text-sm text-red-600 py-2">{error}</p>
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-600 py-4">
        承認待ちの端末はありません。
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 font-semibold text-slate-800">
        承認待ち端末
      </div>
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
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
                ユーザー: {r.user_id.slice(0, 8)}… / 申請:{' '}
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
  )
}
