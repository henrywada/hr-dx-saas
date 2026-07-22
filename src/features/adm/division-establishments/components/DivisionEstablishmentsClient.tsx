'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import type { DivisionEstablishmentListItem } from '../types'
import {
  deleteDivisionEstablishment,
  upsertDivisionEstablishment,
  upsertTenantStressSettings,
} from '../actions'
import { Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'

type DivisionRow = {
  id: string
  name: string | null
  parent_id: string | null
  layer: number | null
}

function buildPathLabel(divisionId: string, divById: Map<string, DivisionRow>): string {
  const parts: string[] = []
  let cur: string | null = divisionId
  const guard = new Set<string>()
  while (cur && !guard.has(cur)) {
    guard.add(cur)
    const d = divById.get(cur)
    if (!d) break
    parts.push(d.name?.trim() || '—')
    cur = d.parent_id
  }
  return parts.reverse().join(' › ')
}

type Props = {
  tenantId: string
  establishments: DivisionEstablishmentListItem[]
  /** アンカー部署 division_id → 拠点に紐づく人数（チェックボックス行に表示） */
  anchorEmployeeCounts: Record<string, number>
  divisions: DivisionRow[]
  minRespondents: number
  unassignedCount: number
}

export default function DivisionEstablishmentsClient({
  establishments: initial,
  anchorEmployeeCounts,
  divisions,
  minRespondents: minInitial,
  unassignedCount,
}: Props) {
  const [rows, setRows] = useState(initial)
  const [minN, setMinN] = useState(String(minInitial))
  const [minSettingsOpen, setMinSettingsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [selectedAnchorIds, setSelectedAnchorIds] = useState<Set<string>>(new Set())
  const [addr, setAddr] = useState('')
  const [laborName, setLaborName] = useState('')

  const divById = useMemo(() => new Map(divisions.map(d => [d.id, d])), [divisions])

  const divisionOptions = useMemo(() => {
    const sorted = [...divisions].sort((a, b) => {
      const la = a.layer ?? 0
      const lb = b.layer ?? 0
      if (la !== lb) return la - lb
      return (a.name ?? '').localeCompare(b.name ?? '', 'ja')
    })
    return sorted.map(d => ({
      ...d,
      path_label: buildPathLabel(d.id, divById),
    }))
  }, [divisions, divById])

  useEffect(() => {
    setRows(initial)
  }, [initial])

  const resetForm = () => {
    setName('')
    setCode('')
    setSelectedAnchorIds(new Set())
    setAddr('')
    setLaborName('')
    setEditingId(null)
  }

  const openNew = () => {
    resetForm()
    setEditingId('new')
    if (divisionOptions[0]) setSelectedAnchorIds(new Set([divisionOptions[0].id]))
  }

  const openEdit = (r: DivisionEstablishmentListItem) => {
    setEditingId(r.id)
    setName(r.name)
    setCode(r.code ?? '')
    setSelectedAnchorIds(new Set(r.anchors.map(a => a.division_id)))
    setAddr(r.workplace_address ?? '')
    setLaborName(r.labor_office_reporting_name ?? '')
  }

  const toggleAnchor = (id: string) => {
    setSelectedAnchorIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveEstablishment = () => {
    startTransition(async () => {
      const res = await upsertDivisionEstablishment({
        id: editingId && editingId !== 'new' ? editingId : undefined,
        name,
        code: code || null,
        anchor_division_ids: [...selectedAnchorIds],
        workplace_address: addr || null,
        labor_office_reporting_name: laborName || null,
      })
      if (!res.success) {
        alert(res.error ?? '保存に失敗しました')
        return
      }
      window.location.reload()
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('この拠点を削除しますか？')) return
    startTransition(async () => {
      const res = await deleteDivisionEstablishment(id)
      if (!res.success) {
        alert(res.error ?? '削除に失敗しました')
        return
      }
      setRows(prev => prev.filter(r => r.id !== id))
    })
  }

  const handleSaveSettings = () => {
    startTransition(async () => {
      const res = await upsertTenantStressSettings(Number(minN))
      if (!res.success) {
        alert(res.error ?? '設定の保存に失敗しました')
        return
      }
      setMinSettingsOpen(false)
      alert('集団分析の最低人数を保存しました。')
    })
  }

  const showForm =
    editingId === 'new' ||
    (editingId != null && editingId !== 'new' && rows.some(r => r.id === editingId))

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 画面の目的・実施グループとの役割分担 */}
      <div className="rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-4 py-3 text-sm text-[#57606a] space-y-1">
        <p>
          <span className="font-semibold text-[#24292f]">この画面の目的：</span>
          集団分析・進捗の「拠点別」表示や労基署報告の単位となる
          <span className="font-semibold text-[#24292f]">事業場（拠点）</span>
          を登録します。
        </p>
        <p>
          受検の期間・対象部署・質問数は
          <Link
            href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_MNT_SETS}
            className="mx-1 font-semibold text-[#FD7601] hover:underline"
          >
            実施（期間・対象部署・対象者）の管理
          </Link>
          で設定します（別画面です）。
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS}
            className="text-sm text-[#FD7601] hover:underline"
          >
            ← 集団分析ダッシュボード
          </Link>
          <Link
            href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_MNT_SETS}
            className="text-sm text-[#FD7601] hover:underline"
          >
            実施（期間・対象部署・対象者）の管理 →
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setMinSettingsOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#e2e6ec] bg-white text-sm font-semibold text-[#24292f] shadow-sm hover:bg-[#f6f8fa]"
        >
          <Settings2 className="w-4 h-4 text-[#57606a]" />
          集団分析・開示の最低人数
        </button>
      </div>

      {unassignedCount > 0 && rows.length > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          拠点に属さない従業員が {unassignedCount}{' '}
          名います。アンカー部署と組織ツリーを見直してください。
        </p>
      )}

      {minSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="閉じる"
            onClick={() => setMinSettingsOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#e2e6ec] bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e6ec] bg-[#f6f8fa]">
              <h2 className="text-base font-bold text-[#24292f]">集団分析・開示の最低人数</h2>
              <button
                type="button"
                onClick={() => setMinSettingsOpen(false)}
                className="p-1.5 rounded-lg text-[#57606a] hover:bg-[#f6f8fa]"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-[#57606a] leading-relaxed">
                この人数未満のグループでは健康リスク等を画面・PDF上で非開示にします（デフォルト11名）。
              </p>
              <div>
                <label className="block text-xs font-bold text-[#57606a] mb-1">最低回答者数</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm"
                  value={minN}
                  onChange={e => setMinN(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setMinSettingsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#57606a] bg-white border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa]"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveSettings}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#FD7601] rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white rounded-lg border border-[#e2e6ec] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#24292f]">拠点一覧</h2>
            <p className="text-xs text-[#57606a] mt-0.5">
              組織のアンカー部署を紐づけ、従業員を事業場単位に割り当てます。
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e6ec] text-sm font-semibold text-[#24292f] hover:bg-[#f6f8fa]"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#57606a] border-b border-[#e2e6ec] bg-[#f6f8fa]">
                <th className="py-2 px-3 font-semibold w-24">コード</th>
                <th className="py-2 px-3 font-semibold w-40">拠点名</th>
                <th className="py-2 px-3 font-semibold">アンカー部署（組織パス）</th>
                <th className="py-2 px-3 font-semibold text-right w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-[#57606a]">
                    拠点が未登録です。「追加」から事業場を登録してください。
                    <span className="block text-xs mt-2">
                      ※受検期間の設定は
                      <Link
                        href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_MNT_SETS}
                        className="mx-1 text-[#FD7601] hover:underline"
                      >
                        実施（期間・対象部署・対象者）の管理
                      </Link>
                      です。
                    </span>
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="align-top border-b border-[#e2e6ec] hover:bg-[#f6f8fa]">
                    <td className="py-3 px-3 text-[#57606a] whitespace-nowrap font-mono text-xs">
                      {r.code ?? '—'}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#24292f]">{r.name}</td>
                    <td className="py-3 px-3 text-[#24292f]">
                      {r.anchors.length === 0 ? (
                        <span className="text-[#57606a]">—</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {r.anchors.map(a => (
                            <li
                              key={a.division_id}
                              className="pl-2 border-l-2 border-teal-400 text-xs leading-relaxed"
                            >
                              <span className="font-mono text-[10px] text-[#57606a] mr-1">
                                L{a.layer ?? '—'}
                              </span>
                              {a.path_label}
                              <span className="text-[#57606a] tabular-nums ml-1">
                                （{a.employee_count}名）
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="inline-flex p-1.5 rounded-md text-[#57606a] hover:bg-[#f6f8fa]"
                        title="拠点を編集"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="inline-flex p-1.5 rounded-md text-rose-500 hover:bg-rose-50"
                        title="拠点を削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <section className="bg-white rounded-lg border border-[#e2e6ec] shadow-xs overflow-hidden border-l-[5px] border-l-[#FD7601]">
          <div className="p-5 space-y-4">
            <h2 className="text-lg font-bold text-[#24292f]">
              {editingId === 'new' ? '拠点の新規登録' : '拠点の編集'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#57606a] mb-1">
                  拠点名（必須）
                </label>
                <input
                  className="w-full border border-[#e2e6ec] rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#57606a] mb-1">コード</label>
                <input
                  className="w-full border border-[#e2e6ec] rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#57606a] mb-1">
                  アンカー部署（複数可・1件以上必須）
                </label>
                <p className="text-xs text-[#57606a] mb-2">
                  従業員の所属がいずれかのアンカー（またはその子孫）なら、この拠点に属します。
                </p>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-[#e2e6ec] bg-[#f6f8fa]/50 divide-y divide-[#e2e6ec]">
                  {divisionOptions.map(d => (
                    <label
                      key={d.id}
                      className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-[#e2e6ec]"
                        checked={selectedAnchorIds.has(d.id)}
                        onChange={() => toggleAnchor(d.id)}
                      />
                      <span className="text-[#24292f] leading-snug text-xs">
                        <span className="text-[10px] font-mono text-[#57606a] mr-1.5">
                          L{d.layer ?? '—'}
                        </span>
                        {d.path_label}
                        {d.id in anchorEmployeeCounts ? (
                          <span className="text-[#57606a] tabular-nums ml-1">
                            （{anchorEmployeeCounts[d.id]}名）
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#57606a] mb-1">事業場所在地</label>
                <input
                  className="w-full border border-[#e2e6ec] rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  value={addr}
                  onChange={e => setAddr(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#57606a] mb-1">
                  労働基準監督署報告用名称
                </label>
                <input
                  className="w-full border border-[#e2e6ec] rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  value={laborName}
                  onChange={e => setLaborName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#e2e6ec]">
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveEstablishment}
                className="px-4 py-1.5 rounded-lg bg-[#FD7601] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
              >
                保存
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-1.5 text-xs text-[#57606a] hover:text-[#24292f]"
              >
                キャンセル
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
