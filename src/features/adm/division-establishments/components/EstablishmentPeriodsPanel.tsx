'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { CalendarRange, Pencil, Plus, Trash2 } from 'lucide-react'
import type { StressCheckPeriod } from '@/features/stress-check/types'
import {
  deleteStressCheckPeriod,
  fetchPeriodsForEstablishment,
} from '@/features/adm/stress-check/mnt-sets/actions'
import { PeriodFormDialog } from '@/features/adm/stress-check/mnt-sets/components/PeriodFormDialog'

type Props = {
  tenantId: string
  establishmentId: string
}

const statusLabel: Record<string, string> = {
  draft: '準備中',
  active: '実施中',
  closed: '終了',
}

export function EstablishmentPeriodsPanel({ tenantId, establishmentId }: Props) {
  const [periods, setPeriods] = useState<StressCheckPeriod[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<StressCheckPeriod | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(() => {
    startTransition(async () => {
      try {
        setLoadError(null)
        const rows = await fetchPeriodsForEstablishment(establishmentId)
        setPeriods(rows)
      } catch (e) {
        console.error(e)
        setLoadError('実施期間の読み込みに失敗しました')
      }
    })
  }, [establishmentId])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (p: StressCheckPeriod) => {
    setEditing(p)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (!confirm('この実施期間を削除しますか？')) return
    startTransition(async () => {
      const res = await deleteStressCheckPeriod(id)
      if (!res.success) {
        alert(res.error ?? '削除に失敗しました')
        return
      }
      load()
    })
  }

  return (
    <div className="mt-6 pt-5 border-t border-blue-200/60 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-blue-600" />
          ストレスチェック実施期間（この拠点）
        </h3>
        <button
          type="button"
          disabled={isPending}
          onClick={openCreate}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          期間を追加
        </button>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">
        タイトル・対象年度・質問数（57/23）・ステータス・開始日・終了日を拠点単位で管理します。従業員画面では所属拠点に紐づく「実施中」期間が表示されます。
      </p>
      {loadError && <p className="text-xs text-rose-600">{loadError}</p>}

      {periods.length === 0 && !loadError ? (
        <p className="text-xs text-slate-500 bg-white/60 rounded-lg px-3 py-2 border border-slate-200">
          未登録です。「期間を追加」から登録してください。
        </p>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white/80 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 px-3 font-semibold">タイトル</th>
                <th className="py-2 px-3 font-semibold whitespace-nowrap">年度</th>
                <th className="py-2 px-3 font-semibold whitespace-nowrap">質問</th>
                <th className="py-2 px-3 font-semibold whitespace-nowrap">状態</th>
                <th className="py-2 px-3 font-semibold min-w-[8rem]">期間</th>
                <th className="py-2 px-3 w-20 text-right font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 px-3 text-slate-800 font-medium">{p.title}</td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{p.fiscal_year}</td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{p.questionnaire_type}問</td>
                  <td className="py-2 px-3">
                    <span
                      className={
                        p.status === 'active'
                          ? 'text-emerald-700 font-semibold'
                          : p.status === 'draft'
                            ? 'text-slate-600'
                            : 'text-slate-400'
                      }
                    >
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                    {String(p.start_date).split('T')[0]} 〜 {String(p.end_date).split('T')[0]}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      title="編集"
                      onClick={() => openEdit(p)}
                      className="inline-flex p-1 rounded text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="削除"
                      onClick={() => handleDelete(p.id)}
                      className="inline-flex p-1 rounded text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PeriodFormDialog
        open={dialogOpen}
        tenantId={tenantId}
        divisionEstablishmentId={establishmentId}
        period={editing}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
          load()
        }}
      />
    </div>
  )
}
