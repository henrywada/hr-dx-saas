'use client'

import { Fragment, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import type { DivisionEstablishmentListItem } from '../types'
import { upsertTenantStressSettings } from '../actions'
import { deleteStressCheckPeriod } from '@/features/adm/stress-check/mnt-sets/actions'
import { PeriodFormDialog } from '@/features/adm/stress-check/mnt-sets/components/PeriodFormDialog'
import { PeriodTargetsModal } from '@/features/adm/stress-check/mnt-sets/components/PeriodTargetsModal'
import type { StressCheckPeriodWithDivisions } from '@/features/stress-check/types'
import type { Division } from '@/features/organization/types'
import { Pencil, Plus, Settings2, Trash2, Users, X } from 'lucide-react'

type DivisionRow = {
  id: string
  name: string | null
  parent_id: string | null
  layer: number | null
}

type Props = {
  tenantId: string
  establishments: DivisionEstablishmentListItem[]
  anchorEmployeeCounts: Record<string, number>
  divisions: DivisionRow[]
  minRespondents: number
  unassignedCount: number
  periods: StressCheckPeriodWithDivisions[]
}

export default function DivisionEstablishmentsClient({
  tenantId,
  divisions,
  minRespondents: minInitial,
  unassignedCount,
  periods: initialPeriods,
}: Props) {
  const router = useRouter()
  const [minN, setMinN] = useState(String(minInitial))
  const [minSettingsOpen, setMinSettingsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [periods, setPeriods] = useState(initialPeriods)
  const [addPeriodOpen, setAddPeriodOpen] = useState(false)
  const [editPeriodOpen, setEditPeriodOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<StressCheckPeriodWithDivisions | null>(null)
  const [targetsPeriod, setTargetsPeriod] = useState<StressCheckPeriodWithDivisions | null>(null)

  const divById = new Map(divisions.map(d => [d.id, d]))

  const buildFullPath = (divisionId: string): string => {
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
    return parts.reverse().join(' / ')
  }

  useEffect(() => {
    setPeriods(initialPeriods)
  }, [initialPeriods])

  const handleDeletePeriod = (id: string) => {
    if (!confirm('この実施グループを削除しますか？')) return
    startTransition(async () => {
      const res = await deleteStressCheckPeriod(id)
      if (!res.success) {
        alert(res.error ?? '削除に失敗しました')
        return
      }
      setPeriods(prev => prev.filter(p => p.id !== id))
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
          実施グループに含まれない従業員が {unassignedCount}{' '}
          名います。実施グループの対象部署を見直してください。
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
                  onChange={e => setMinN(e.target.value)}
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
          <h2 className="text-lg font-bold text-slate-900">実施グループ</h2>
          <button
            type="button"
            onClick={() => setAddPeriodOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
        </div>

        {periods.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            「追加」から実施グループを登録してください。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 px-3 font-semibold w-[28%]">タイトル</th>
                  <th className="py-2 px-2 font-semibold whitespace-nowrap">年度</th>
                  <th className="py-2 px-2 font-semibold whitespace-nowrap">質問</th>
                  <th className="py-2 px-2 font-semibold">期間</th>
                  <th className="py-2 pr-3 font-semibold text-right w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {periods.map(p => (
                  <Fragment key={p.id}>
                    {/* メイン行 */}
                    <tr className="border-t border-slate-100 align-top">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{p.title}</td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                        {p.fiscal_year}
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                        {p.questionnaire_type}問
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap text-xs">
                        {String(p.start_date).split('T')[0]} 〜 {String(p.end_date).split('T')[0]}
                      </td>
                      <td className="py-2.5 pr-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPeriod(p)
                            setEditPeriodOpen(true)
                          }}
                          className="inline-flex p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                          title="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetsPeriod(p)}
                          className="inline-flex p-1.5 rounded-md text-blue-500 hover:bg-blue-50"
                          title="対象者編集"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePeriod(p.id)}
                          className="inline-flex p-1.5 rounded-md text-rose-500 hover:bg-rose-50"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {/* 対象部署サブ行 */}
                    <tr className="border-b border-slate-100">
                      <td colSpan={5} className="pb-3 px-3">
                        {p.divisionIds.length === 0 ? (
                          <span className="text-xs text-slate-400">対象部署なし</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {p.divisionIds.map(divId => (
                              <span
                                key={divId}
                                className="inline-flex items-center text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full"
                              >
                                {buildFullPath(divId)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PeriodFormDialog
        open={addPeriodOpen}
        tenantId={tenantId}
        allDivisions={divisions as unknown as Division[]}
        onClose={() => {
          setAddPeriodOpen(false)
          router.refresh()
        }}
      />

      <PeriodFormDialog
        open={editPeriodOpen}
        tenantId={tenantId}
        period={editingPeriod}
        allDivisions={divisions as unknown as Division[]}
        onClose={() => {
          setEditPeriodOpen(false)
          setEditingPeriod(null)
          router.refresh()
        }}
      />

      {targetsPeriod && (
        <PeriodTargetsModal
          period={targetsPeriod}
          allDivisions={divisions as unknown as Division[]}
          onClose={() => setTargetsPeriod(null)}
        />
      )}
    </div>
  )
}
