'use client'

import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect, useMemo, useState } from 'react'

type EmpPick = { user_id: string; name: string | null; employee_no: string | null }

type Props = {
  open: boolean
  onClose: () => void
  supervisorUserId: string
  tenantId: string
  onSaved: () => void
}

/** 追加のみ: 従業員検索 → upsert（一覧と同じ PostgREST テーブル API。RPC が schema cache に載らない環境でも動く） */
export function SqpEditModal({ open, onClose, supervisorUserId, tenantId, onSaved }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [q, setQ] = useState('')
  const [candidates, setCandidates] = useState<EmpPick[]>([])
  const [employeeUserId, setEmployeeUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pickedLabel, setPickedLabel] = useState('')

  useEffect(() => {
    if (!open) return
    setEmployeeUserId('')
    setErr(null)
    setQ('')
    setCandidates([])
    setPickedLabel('')
  }, [open])

  /** 「検索」ボタン（または Enter）でのみ実行 */
  const runEmployeeSearch = useCallback(async () => {
    setErr(null)
    const t = q.trim()
    if (t.length < 1) {
      setCandidates([])
      return
    }
    const pat = `%${t.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
    const { data: rpcTenantId } = await supabase.rpc('current_tenant_id')
    const activeTenantId =
      rpcTenantId != null && String(rpcTenantId).length > 0 ? String(rpcTenantId) : tenantId
    if (!activeTenantId) {
      setCandidates([])
      setErr('テナント情報を取得できませんでした。')
      return
    }
    const base = () =>
      supabase
        .from('employees')
        .select('user_id, name, employee_no')
        .eq('tenant_id', activeTenantId)
        .not('user_id', 'is', null)

    const [{ data: byName, error: e1 }, { data: byNo, error: e2 }] = await Promise.all([
      base().ilike('name', pat).limit(15),
      base().ilike('employee_no', pat).limit(15),
    ])
    if (e1 || e2) {
      setErr(e1?.message ?? e2?.message ?? '検索エラー')
      return
    }
    const map = new Map<string, EmpPick>()
    for (const row of [...(byName ?? []), ...(byNo ?? [])]) {
      if (row.user_id) map.set(row.user_id, row as EmpPick)
    }
    setCandidates([...map.values()].slice(0, 15))
  }, [q, supabase, tenantId])

  const save = async () => {
    if (!employeeUserId) {
      setErr('従業員を選択してください')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const { data: rpcTenantId } = await supabase.rpc('current_tenant_id')
      const activeTenantId =
        rpcTenantId != null && String(rpcTenantId).length > 0 ? String(rpcTenantId) : tenantId
      if (!activeTenantId) {
        setErr('テナント情報を取得できませんでした。')
        return
      }
      const { error: upErr } = await supabase.from('supervisor_qr_permissions').upsert(
        {
          tenant_id: activeTenantId,
          supervisor_user_id: supervisorUserId,
          employee_user_id: employeeUserId,
          can_display: true,
          scope: 'all',
        },
        { onConflict: 'tenant_id,supervisor_user_id,employee_user_id' },
      )
      if (upErr) {
        setErr(upErr.message)
        return
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '保存エラー')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">従業員を追加</h3>
        <p className="text-sm text-slate-500">
          名前を入力し「検索」で候補を表示、選択して保存すると QR 表示が許可されます（scope は all 固定）。
        </p>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">従業員を検索</label>
          <div className="flex gap-2">
            <input
              type="search"
              className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="名前・社員番号で検索"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runEmployeeSearch()
                }
              }}
            />
            <button
              type="button"
              className="shrink-0 px-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700"
              onClick={() => void runEmployeeSearch()}
            >
              検索
            </button>
          </div>
          <ul className="mt-2 max-h-40 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
            {candidates.map((c) => (
              <li key={c.user_id!}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  onClick={() => {
                    setEmployeeUserId(c.user_id!)
                    setPickedLabel(`${(c.name ?? '').trim() || c.employee_no || c.user_id}`)
                    setCandidates([])
                    setQ('')
                  }}
                >
                  {(c.name ?? '').trim() || c.employee_no || c.user_id}
                </button>
              </li>
            ))}
          </ul>
          {pickedLabel && (
            <p className="text-sm mt-2 text-slate-700">
              選択中: <span className="font-medium">{pickedLabel}</span>
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="px-4 py-2 text-sm rounded-lg border border-slate-200" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-orange-500 text-white disabled:opacity-50"
            onClick={() => void save()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
