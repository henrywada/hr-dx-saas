'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { Loader2, AlertCircle, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
  fetchGroupAnalysisForLayer,
  fetchDistributionStats,
} from '@/features/adm/ai-workplace-improvement/actions'
import type { GroupData } from '@/features/adm/stress-check/queries'
import type { DivisionTreeNode } from '@/features/adm/ai-workplace-improvement/actions'

function buildPath(id: string, nodeMap: Map<string, DivisionTreeNode>): string {
  const parts: string[] = []
  let current: string | null = id
  while (current) {
    const node = nodeMap.get(current)
    if (!node) break
    parts.unshift(node.name)
    current = node.parent_id
  }
  return parts.join('/')
}

interface OrgLayerAnalysisProps {
  availableLayers: number[]
  selectedLayer: number | null
  onLayerChange: (layer: number | null) => void
  selectedDivisionId: string | null
  onDivisionSelect: (divisionId: string, divisionName: string) => void
}

function scoreColor(value: number | null): string {
  if (value == null) return 'text-slate-400'
  if (value >= 4) return 'text-teal-600 font-semibold'
  if (value >= 3) return 'text-slate-700'
  return 'text-orange-600 font-semibold'
}

function riskColor(value: number | null): string {
  if (value == null) return 'text-slate-400'
  if (value >= 120) return 'text-red-600 font-bold'
  if (value >= 100) return 'text-orange-500 font-semibold'
  return 'text-teal-600'
}

function highStressColor(value: number | null): string {
  if (value == null) return 'text-slate-400'
  if (value >= 15) return 'text-red-600 font-bold'
  if (value >= 10) return 'text-orange-500 font-semibold'
  return 'text-teal-600'
}

export default function OrgLayerAnalysis({
  availableLayers,
  selectedLayer,
  onLayerChange,
  selectedDivisionId,
  onDivisionSelect,
}: OrgLayerAnalysisProps) {
  // ドロップダウンの選択値（文字列）: 'all'=全て, ''=層1(parent_id IS NULL), '2'=層2, '3'=層3
  // 層1 は layer 列の値に依存せず parent_id IS NULL で引くため null を渡す
  const [selectValue, setSelectValue] = useState<string>(
    selectedLayer != null ? String(selectedLayer) : 'all'
  )

  const [groupData, setGroupData] = useState<GroupData[] | null>(null)
  const [submittedCountMap, setSubmittedCountMap] = useState<Record<string, number>>({})
  const [divisions, setDivisions] = useState<DivisionTreeNode[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 部署ツリーはマウント時に1回だけ取得（パス構築用）
  useEffect(() => {
    fetchDistributionStats().then(result => {
      if (result.success && result.divisions) {
        setDivisions(result.divisions)
      }
    })
  }, [])

  useEffect(() => {
    setFetchError(null)
    startTransition(async () => {
      const result = await fetchGroupAnalysisForLayer(selectedLayer, selectValue === 'all')
      if (result.success && result.groups) {
        setGroupData(result.groups)
        setSubmittedCountMap(result.submittedCountMap ?? {})
      } else {
        setFetchError(result.error || 'データ取得に失敗しました。')
        setGroupData(null)
        setSubmittedCountMap({})
      }
    })
  }, [selectedLayer, selectValue])

  const nodeMap = useMemo(() => new Map(divisions.map(d => [d.id, d])), [divisions])

  const layerLabel =
    selectValue === 'all' ? '全て' : selectValue === '' ? '層1' : `層${Number(selectValue)}`

  return (
    <div className="space-y-6">
      {/* Step 1: 組織レイヤー選択 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
            1
          </span>
          <h2 className="text-lg font-semibold text-slate-800">組織レイヤーを選択</h2>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600 shrink-0">組織層を選択：</label>
          {availableLayers.length === 0 ? (
            <span className="text-sm text-slate-400">レイヤー未設定</span>
          ) : (
            <select
              value={selectValue}
              onChange={e => {
                const v = e.target.value
                setSelectValue(v)
                // 層1 は parent_id IS NULL で引くため null、それ以外は実際の layer 値を渡す
                onLayerChange(v === 'all' || v === '' ? null : Number(v))
                setGroupData(null)
              }}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">全て</option>
              <option value="">層1</option>
              {availableLayers
                .filter(l => l > 1)
                .map(l => (
                  <option key={l} value={l}>
                    層{l}
                  </option>
                ))}
            </select>
          )}
          {isPending && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
      </section>

      {/* Step 2: ストレスチェック集計結果 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
            2
          </span>
          <h2 className="text-lg font-semibold text-slate-800">
            ストレスチェック集計結果（{layerLabel}）
          </h2>
        </div>

        {fetchError && (
          <Card className="p-4 border-red-200 bg-red-50">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {fetchError}
            </div>
          </Card>
        )}

        {isPending && !groupData && (
          <Card className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">データを取得中...</p>
          </Card>
        )}

        {!isPending && groupData && groupData.length === 0 && (
          <Card className="p-6 text-center text-slate-500 border-dashed text-sm">
            この層の集団分析データがありません。ストレスチェックの集団分析を先に実施してください。
          </Card>
        )}

        {groupData && groupData.length > 0 && (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[140px]">
                      部署名
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700">
                      実施/対象
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700">
                      仕事の負担
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700">
                      コントロール
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700">
                      上司サポート
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700">
                      同僚サポート
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700">
                      高ストレス率
                    </th>
                    <th className="text-center px-3 py-3 font-semibold text-slate-700">
                      健康リスク
                    </th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupData.map(row => {
                    const isSelected = selectedDivisionId === row.division_id
                    const suppressed = row.is_suppressed === true
                    return (
                      <tr
                        key={row.division_id}
                        className={`transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-400' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {nodeMap.size > 0 && nodeMap.has(row.division_id)
                            ? buildPath(row.division_id, nodeMap)
                            : row.name}
                        </td>
                        <td className="px-3 py-3 text-center text-blue-600 font-medium">
                          {submittedCountMap[row.division_id] ?? 0}/{row.member_count}
                        </td>
                        <td
                          className={`px-3 py-3 text-center ${suppressed ? 'text-slate-300' : scoreColor(row.workload)}`}
                        >
                          {suppressed ? '—' : (row.workload?.toFixed(1) ?? '—')}
                        </td>
                        <td
                          className={`px-3 py-3 text-center ${suppressed ? 'text-slate-300' : scoreColor(row.control)}`}
                        >
                          {suppressed ? '—' : (row.control?.toFixed(1) ?? '—')}
                        </td>
                        <td
                          className={`px-3 py-3 text-center ${suppressed ? 'text-slate-300' : scoreColor(row.supervisor_support)}`}
                        >
                          {suppressed ? '—' : (row.supervisor_support?.toFixed(1) ?? '—')}
                        </td>
                        <td
                          className={`px-3 py-3 text-center ${suppressed ? 'text-slate-300' : scoreColor(row.colleague_support)}`}
                        >
                          {suppressed ? '—' : (row.colleague_support?.toFixed(1) ?? '—')}
                        </td>
                        <td
                          className={`px-3 py-3 text-center ${suppressed ? 'text-slate-300' : highStressColor(row.high_stress_rate)}`}
                        >
                          {suppressed
                            ? '—'
                            : row.high_stress_rate != null
                              ? `${row.high_stress_rate.toFixed(1)}%`
                              : '—'}
                        </td>
                        <td
                          className={`px-3 py-3 text-center ${suppressed ? 'text-slate-300' : riskColor(row.health_risk)}`}
                        >
                          {suppressed ? '—' : (row.health_risk?.toFixed(0) ?? '—')}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() =>
                              onDivisionSelect(
                                row.division_id,
                                nodeMap.size > 0 && nodeMap.has(row.division_id)
                                  ? buildPath(row.division_id, nodeMap)
                                  : row.name
                              )
                            }
                            disabled={suppressed}
                            title={suppressed ? '回答者数不足のため分析できません' : undefined}
                            className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap
                              ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : suppressed
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                              }`}
                          >
                            この部署で生成 <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 px-4 py-2 border-t border-slate-100">
              ※
              健康リスク100=全国平均。仕事の負担・コントロール・サポートは5段階スコア。—は回答者数不足。
            </p>
          </Card>
        )}
      </section>
    </div>
  )
}
