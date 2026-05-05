'use client'

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import type { DivisionEstablishmentListItem } from '../types'
import {
  deleteDivisionEstablishment,
  upsertDivisionEstablishment,
  upsertTenantStressSettings,
} from '../actions'
import { PeriodFormDialog } from '@/features/adm/stress-check/mnt-sets/components/PeriodFormDialog'
import type { StressCheckPeriod } from '@/features/stress-check/types'
import { Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'
type DivisionRow = { id: string; name: string | null; parent_id: string | null; layer: number | null }

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
  tenantId,
  establishments: initial,
  anchorEmployeeCounts,
  divisions,
  minRespondents: minInitial,
  unassignedCount,
}: Props) {
  const router = useRouter()
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

  const [listPeriodDialogOpen, setListPeriodDialogOpen] = useState(false)
  const [listPeriodEditing, setListPeriodEditing] = useState<StressCheckPeriod | null>(null)
  const [listPeriodEstablishmentId, setListPeriodEstablishmentId] = useState<string | null>(null)

  const divById = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions])

  const divisionOptions = useMemo(() => {
    const sorted = [...divisions].sort((a, b) => {
      const la = a.layer ?? 0
      const lb = b.layer ?? 0
      if (la !== lb) return la - lb
      return (a.name ?? '').localeCompare(b.name ?? '', 'ja')
    })
    return sorted.map((d) => ({
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
    setSelectedAnchorIds(new Set(r.anchors.map((a) => a.division_id)))
    setAddr(r.workplace_address ?? '')
    setLaborName(r.labor_office_reporting_name ?? '')
  }

  const toggleAnchor = (id: string) => {
    setSelectedAnchorIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveEstablishment = () => {
    startTransition(async () => {
      const anchor_division_ids = [...selectedAnchorIds]
      const res = await upsertDivisionEstablishment({
        id: editingId && editingId !== 'new' ? editingId : undefined,
        name,
        code: code || null,
        anchor_division_ids,
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
      setRows((prev) => prev.filter((r) => r.id !== id))
    })
  }

  const periodStatusClass = (status: string) =>
    status === 'active'
      ? 'text-emerald-700 font-semibold'
      : status === 'draft'
        ? 'text-slate-600'
        : 'text-slate-400'

  const periodStatusLabel: Record<string, string> = {
    draft: '準備中',
    active: '実施中',
    closed: '終了',
  }

  /** 鉛筆：実施期間が無ければ追加、あれば代表行の編集 */
  const openListPeriodFromPencil = (p: StressCheckPeriod | null, establishmentId: string) => {
    setListPeriodEditing(p)
    setListPeriodEstablishmentId(establishmentId)
    setListPeriodDialogOpen(true)
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
    editingId === 'new' || (editingId != null && editingId !== 'new' && rows.some((r) => r.id === editingId))

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS}
            className="text-sm text-blue-600 hover:underline"
          >
            ← 集団分析ダッシュボード
          </Link>
          <Link
            href={APP_ROUTES.TENANT.ADMIN_PROGRAM_TARGETS}
            className="text-sm text-blue-600 hover:underline"
          >
            ← 実施対象者管理
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setMinSettingsOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Settings2 className="w-4 h-4 text-slate-500" />
          集団分析・開示の最低人数
        </button>
      </div>

      {unassignedCount > 0 && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          拠点に属さない従業員が {unassignedCount} 名います。アンカー部署と組織ツリーを見直してください。
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
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">集団分析・開示の最低人数</h2>
              <button
                type="button"
                onClick={() => setMinSettingsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                この人数未満のグループでは健康リスク等を画面・PDF上で非開示にします（デフォルト11名）。
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">最低回答者数</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={minN}
                  onChange={(e) => setMinN(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setMinSettingsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveSettings}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">拠点一覧</h2>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="text-left text-xs text-slate-600 border-b border-slate-100 bg-slate-50/80">
                <th colSpan={6} className="py-2.5 px-3 font-bold">
                  ストレスチェック実施期間
                </th>
              </tr>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="py-2 px-3 pr-2 font-semibold w-[28%]">タイトル</th>
                <th className="py-2 px-2 font-semibold whitespace-nowrap w-[4.5rem]">年度</th>
                <th className="py-2 px-2 font-semibold whitespace-nowrap w-[3.5rem]">質問</th>
                <th className="py-2 px-2 font-semibold whitespace-nowrap w-[4.5rem]">状態</th>
                <th className="py-2 px-2 font-semibold min-w-0">期間</th>
                <th className="py-2 pr-3 w-20 text-right font-semibold">操作</th>
              </tr>
              <tr className="text-left text-xs text-slate-500 border-b-2 border-slate-200">
                <th className="py-2 px-3 pr-2 font-semibold whitespace-nowrap w-[5rem]">コード</th>
                <th className="py-2 px-2 font-semibold w-[12%]">拠点名</th>
                <th className="py-2 px-2 font-semibold" colSpan={3}>
                  アンカー部署（組織パス）
                </th>
                <th className="py-2 pr-3 w-20 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    拠点が未登録です。「追加」から登録してください。
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const p = r.stress_check_period_list
                  return (
                    <Fragment key={r.id}>
                      <tr className="bg-emerald-50/90 text-xs border-t border-emerald-100 align-top">
                        <td className="py-2.5 px-3 pr-2 text-slate-800 font-medium break-words">
                          {p?.title ?? '—'}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                          {p ? p.fiscal_year : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                          {p ? `${p.questionnaire_type}問` : '—'}
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          {p ? (
                            <span className={periodStatusClass(p.status)}>
                              {periodStatusLabel[p.status] ?? p.status}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                          {p
                            ? `${String(p.start_date).split('T')[0]} 〜 ${String(p.end_date).split('T')[0]}`
                            : '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-right whitespace-nowrap align-middle">
                          <button
                            type="button"
                            onClick={() => openListPeriodFromPencil(p, r.id)}
                            className="inline-flex p-1.5 rounded-md text-slate-500 hover:bg-slate-200/80"
                            title={p ? '実施期間を編集' : '実施期間を追加'}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      <tr className="align-top border-b border-slate-100">
                        <td className="py-3 px-3 pr-2 text-slate-600 whitespace-nowrap">
                          {r.code ?? '—'}
                        </td>
                        <td className="py-3 px-2 font-medium text-slate-900">{r.name}</td>
                        <td className="py-3 px-2 text-slate-700" colSpan={3}>
                          {r.anchors.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <ul className="space-y-2">
                              {r.anchors.map((a, i) => (
                                <li
                                  key={a.division_id}
                                  className="relative pl-3 border-l-2 border-teal-400/80 text-slate-700"
                                >
                                  {i === 0 && (
                                    <span className="absolute -left-px top-2 w-2 h-2 rounded-full bg-teal-500 -translate-x-1/2" />
                                  )}
                                  <span className="text-[10px] font-mono text-slate-400 block">
                                    L{a.layer ?? '—'}
                                  </span>
                                  <span className="text-xs leading-relaxed">
                                    {a.path_label}
                                    <span className="text-slate-500 tabular-nums ml-1">
                                      （{a.employee_count}名）
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-3 pr-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="inline-flex p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
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
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {listPeriodEstablishmentId && (
          <PeriodFormDialog
            open={listPeriodDialogOpen}
            tenantId={tenantId}
            divisionEstablishmentId={listPeriodEstablishmentId}
            period={listPeriodEditing}
            onClose={() => {
              setListPeriodDialogOpen(false)
              setListPeriodEditing(null)
              setListPeriodEstablishmentId(null)
              router.refresh()
            }}
          />
        )}
      </section>

      {showForm && (
        <section className="relative bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden pl-5 border-l-[5px] border-l-blue-500">
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              {editingId === 'new' ? '拠点の新規登録' : '拠点の編集'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">拠点名（必須）</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">コード</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  アンカー部署（複数可・1件以上必須）
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  ルートから当該部署までのパスで識別します。従業員の所属がいずれかのアンカー（またはその子孫）なら当該拠点に属します。
                </p>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 divide-y divide-slate-100">
                  {divisionOptions.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-slate-300"
                        checked={selectedAnchorIds.has(d.id)}
                        onChange={() => toggleAnchor(d.id)}
                      />
                      <span className="text-slate-700 leading-snug">
                        <span className="text-[10px] font-mono text-slate-400 mr-1.5">L{d.layer ?? '—'}</span>
                        {d.path_label}
                        {d.id in anchorEmployeeCounts ? (
                          <span className="text-slate-500 tabular-nums ml-1">
                            （{anchorEmployeeCounts[d.id]}名）
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">事業場所在地</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={addr}
                  onChange={(e) => setAddr(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">労働基準監督署報告用名称</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={laborName}
                  onChange={(e) => setLaborName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveEstablishment}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                保存
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
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
