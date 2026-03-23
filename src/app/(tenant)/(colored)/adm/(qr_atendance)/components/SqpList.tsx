'use client'

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchEmployeeEmailsForTenant, revokeSupervisorQrDisplayPermission } from '../actions'
import { SqpEditModal } from './SqpEditModal'

type PermRow = Database['public']['Tables']['supervisor_qr_permissions']['Row']

type Enriched = { name: string; division: string; email: string }

type Props = {
  supervisorUserId: string
  tenantId: string
  /** true のとき監督者でなくてもテナント内の全行を表示（人事向け /adm） */
  canManageTenantWide: boolean
  listVersion: number
  onChanged: () => void
}

/** 許可一覧: 氏名・部署・メール・削除（レコードありかつ can_display=true を許可とみなす。scope は UI では扱わず all 固定で追加） */
export function SqpList({
  supervisorUserId,
  tenantId,
  canManageTenantWide,
  listVersion,
  onChanged,
}: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<PermRow[]>([])
  const [enriched, setEnriched] = useState<Map<string, Enriched>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 15
  const [total, setTotal] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  /** セッションがストレージから復元されたあと一覧を取り直す（初回マウント時の race 対策） */
  const [authEpoch, setAuthEpoch] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        setAuthEpoch((e) => e + 1)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser()
      if (authErr || !userData.user) {
        setError('ログイン情報を確認できませんでした。再度ログインしてください。')
        setRows([])
        setTotal(0)
        setEnriched(new Map())
        return
      }

      // RLS の current_tenant_id() と同じ値で絞る（メタデータの tenant_id だけだとズレて一覧が空になることがある）
      const { data: rpcTenantId } = await supabase.rpc('current_tenant_id')
      const activeTenantId =
        rpcTenantId != null && String(rpcTenantId).length > 0 ? String(rpcTenantId) : tenantId
      if (!activeTenantId) {
        setError('テナント情報を取得できませんでした。')
        setRows([])
        setTotal(0)
        setEnriched(new Map())
        return
      }

      let query = supabase
        .from('supervisor_qr_permissions')
        .select('*', { count: 'exact' })
        .eq('tenant_id', activeTenantId)
        .eq('can_display', true)
      if (!canManageTenantWide) {
        query = query.eq('supervisor_user_id', supervisorUserId)
      }

      const term = debouncedSearch.trim()
      if (term) {
        const esc = term.replace(/%/g, '\\%').replace(/_/g, '\\_')
        const pat = `%${esc}%`
        const baseEmp = () =>
          supabase
            .from('employees')
            .select('user_id')
            .eq('tenant_id', activeTenantId)
            .not('user_id', 'is', null)

        const [{ data: byName }, { data: byNo }, { data: divs }] = await Promise.all([
          baseEmp().ilike('name', pat),
          baseEmp().ilike('employee_no', pat),
          supabase.from('divisions').select('id').eq('tenant_id', activeTenantId).ilike('name', pat),
        ])
        const idSet = new Set<string>()
        for (const e of [...(byName ?? []), ...(byNo ?? [])]) {
          if (e.user_id) idSet.add(e.user_id)
        }
        const divIds = (divs ?? []).map((d) => d.id).filter(Boolean)
        if (divIds.length > 0) {
          const { data: byDiv } = await supabase
            .from('employees')
            .select('user_id')
            .eq('tenant_id', activeTenantId)
            .in('division_id', divIds)
            .not('user_id', 'is', null)
          for (const e of byDiv ?? []) {
            if (e.user_id) idSet.add(e.user_id)
          }
        }
        const matchIds = [...idSet]
        if (matchIds.length === 0) {
          setRows([])
          setTotal(0)
          setEnriched(new Map())
          return
        }
        query = query.in('employee_user_id', matchIds)
      }

      const from = (page - 1) * perPage
      const to = from + perPage - 1
      query = query.order('updated_at', { ascending: false }).range(from, to)

      const { data, error: qErr, count } = await query
      if (qErr) {
        setError(qErr.message)
        setRows([])
        setTotal(0)
        setEnriched(new Map())
        return
      }

      const list = (data ?? []) as PermRow[]
      const userIds = [...new Set(list.map((r) => r.employee_user_id))]
      const nextEnriched = new Map<string, Enriched>()

      if (userIds.length) {
        const { data: emps } = await supabase
          .from('employees')
          .select('user_id, name, employee_no, division:divisions!employees_division_id_fkey(name)')
          .eq('tenant_id', activeTenantId)
          .in('user_id', userIds)

        for (const uid of userIds) {
          nextEnriched.set(uid, { name: uid.slice(0, 8), division: '—', email: '—' })
        }
        for (const e of emps ?? []) {
          if (!e.user_id) continue
          const divRow = e as {
            division?: { name?: string | null } | { name?: string | null }[] | null
          }
          const divObj = Array.isArray(divRow.division) ? divRow.division[0] : divRow.division
          const division = (divObj?.name ?? '').trim() || '—'
          const name = (e.name ?? '').trim() || e.employee_no || e.user_id
          nextEnriched.set(e.user_id, { name, division, email: '—' })
        }

        // ブラウザ RPC get_tenant_employee_auth_email は schema cache 未載せ等で失敗しやすいため、サーバで get_auth_user_email を使用
        const emails = await fetchEmployeeEmailsForTenant(activeTenantId, userIds)
        for (const uid of userIds) {
          const cur = nextEnriched.get(uid)
          const mail = emails[uid]
          if (cur && mail) cur.email = mail
        }
      }

      setRows(list)
      setTotal(count ?? list.length)
      setEnriched(nextEnriched)
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みエラー')
    } finally {
      setLoading(false)
    }
  }, [supabase, tenantId, supervisorUserId, canManageTenantWide, page, perPage, debouncedSearch])

  useEffect(() => {
    void load()
  }, [load, listVersion, authEpoch])

  const removeOne = async (row: PermRow) => {
    setError(null)
    try {
      const res = await revokeSupervisorQrDisplayPermission(row.id)
      if (res.ok === false) {
        setError(res.message)
        return
      }
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除エラー')
    }
  }

  const maxPage = Math.max(1, Math.ceil(total / perPage))

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">権限一覧</h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="search"
          placeholder="氏名・社員番号・部署名で検索"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600"
        >
          追加
        </button>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 whitespace-pre-wrap border border-red-100 bg-red-50 rounded-lg p-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm py-8 text-center">読み込み中…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-2">氏名</th>
                <th className="py-2 pr-2">部署</th>
                <th className="py-2 pr-2">メールアドレス</th>
                <th className="py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = enriched.get(r.employee_user_id)
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{m?.name ?? r.employee_user_id.slice(0, 8)}</td>
                    <td className="py-2 pr-2">{m?.division ?? '—'}</td>
                    <td className="py-2 pr-2 break-all">{m?.email ?? '—'}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="text-red-600 hover:underline text-sm"
                        onClick={() => void removeOne(r)}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-slate-500 text-sm py-6 text-center">データがありません</p>}
        </div>
      )}

      <div className="flex justify-between items-center mt-4 text-sm text-slate-600">
        <span>
          {total} 件中 {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            前へ
          </button>
          <button
            type="button"
            disabled={page >= maxPage}
            className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            次へ
          </button>
        </div>
      </div>

      {createOpen && (
        <SqpEditModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          supervisorUserId={supervisorUserId}
          tenantId={tenantId}
          onSaved={() => {
            setCreateOpen(false)
            onChanged()
          }}
        />
      )}
    </section>
  )
}
