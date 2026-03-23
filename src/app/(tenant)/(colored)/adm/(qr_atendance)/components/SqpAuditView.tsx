'use client'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { useEffect, useMemo, useState } from 'react'

type AuditRow = Database['public']['Tables']['qr_audit_logs']['Row']

type Props = {
  permissionId: string
  open: boolean
  onClose: () => void
}

export function SqpAuditView({ permissionId, open, onClose }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !permissionId) return
    void (async () => {
      setLoading(true)
      setErr(null)
      const { data, error } = await supabase
        .from('qr_audit_logs')
        .select('*')
        .eq('related_table', 'supervisor_qr_permissions')
        .eq('related_id', permissionId)
        .order('created_at', { ascending: false })
        .limit(100)
      setLoading(false)
      if (error) {
        setErr(error.message)
        setRows([])
        return
      }
      setRows((data ?? []) as AuditRow[])
    })()
  }, [open, permissionId, supabase])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">監査ログ</h3>
          <button type="button" className="text-sm text-slate-500 hover:text-slate-800" onClick={onClose}>
            閉じる
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading && <p className="text-sm text-slate-500">読み込み中…</p>}
          {err && <p className="text-sm text-red-600">{err}</p>}
          {!loading && !err && rows.length === 0 && (
            <p className="text-sm text-slate-500">ログがありません</p>
          )}
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="text-sm border border-slate-100 rounded-lg p-3 bg-slate-50/80">
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium text-slate-800">{r.action}</span>
                  <span>{new Date(r.created_at).toLocaleString('ja-JP')}</span>
                </div>
                <pre className="mt-2 text-xs overflow-x-auto text-slate-700 whitespace-pre-wrap break-all">
                  {JSON.stringify(r.payload, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
