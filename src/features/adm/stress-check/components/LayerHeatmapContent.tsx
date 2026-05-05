'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Users,
  Building2,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import OrgHealthMatrixHeatmap from './OrgHealthMatrixHeatmap'
import GroupRadarChart from './GroupRadarChart'
import GroupTrendChart from './GroupTrendChart'
import type { GroupAnalysisMode } from './GroupAnalysisToolbar'
import type { GroupData, GroupTrendRow } from '../queries'

interface LayerHeatmapContentProps {
  groups: GroupData[]
  trendData: GroupTrendRow[]
  mode: GroupAnalysisMode
  layer: number | null
  layers: number[]
}

function isAggregatable(g: GroupData) {
  return !g.is_suppressed && g.health_risk != null
}

export default function LayerHeatmapContent({
  groups,
  trendData,
  mode,
  layer,
  layers,
}: LayerHeatmapContentProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null)

  // タブ切替時（mode/layer 変化時）に選択状態をリセット
  useEffect(() => {
    setSelectedGroup(null)
  }, [mode, layer])

  const base = APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS

  const forAvg = groups.filter(isAggregatable)
  const totalMembers = forAvg.reduce((s, g) => s + g.member_count, 0)
  const currentAvgRisk =
    totalMembers > 0
      ? forAvg.reduce((s, g) => s + (g.health_risk as number) * g.member_count, 0) / totalMembers
      : null

  const prevRows = forAvg.filter(g => g.previous_health_risk != null)
  const prevTotalMembers = prevRows.reduce((s, g) => s + g.member_count, 0)
  const previousAvgRisk =
    prevTotalMembers > 0
      ? prevRows.reduce((s, g) => s + (g.previous_health_risk as number) * g.member_count, 0) /
        prevTotalMembers
      : null

  const riskDiff =
    previousAvgRisk != null && currentAvgRisk != null ? currentAvgRisk - previousAvgRisk : null

  const cautionGroups = groups.filter(
    g => !g.is_suppressed && g.health_risk != null && g.health_risk >= 110
  )
  const highRiskGroups = groups.filter(
    g => !g.is_suppressed && g.health_risk != null && g.health_risk >= 120
  )

  const groupUnitLabel = mode === 'establishment' ? '拠点' : mode === 'layer' ? 'グループ' : '部署'

  const activePillClass =
    'bg-white text-indigo-700 font-bold shadow-md px-4 py-2 rounded-xl text-sm transition-all inline-flex items-center gap-1.5'
  const inactivePillClass =
    'bg-white/20 text-white border border-white/40 hover:bg-white/30 px-4 py-2 rounded-xl text-sm transition-all font-medium inline-flex items-center gap-1.5'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ─── グラデーションヘッダー ─── */}
      <div className="bg-gradient-to-r from-indigo-800 to-blue-600 px-6 pt-8 pb-6 shadow-lg">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">組織健康度分析</h1>
              <p className="text-indigo-200 text-sm mt-1">
                ストレスチェック集団分析｜組織レイヤー別ヒートマップ
              </p>
            </div>
            <Link
              href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS}
              className="shrink-0 text-xs text-indigo-200 hover:text-white underline underline-offset-2 transition-colors"
            >
              拠点・最低人数設定
            </Link>
          </div>

          {/* レイヤー選択 pills */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${base}?mode=establishment`}
              prefetch={false}
              className={mode === 'establishment' ? activePillClass : inactivePillClass}
            >
              <Building2 className="h-3.5 w-3.5" />
              拠点別
            </Link>
            <Link
              href={base}
              prefetch={false}
              className={mode === 'all' ? activePillClass : inactivePillClass}
            >
              <Layers className="h-3.5 w-3.5" />
              全社
            </Link>
            {layers.map(l => (
              <Link
                key={l}
                href={`${base}?mode=layer&layer=${l}`}
                prefetch={false}
                className={mode === 'layer' && layer === l ? activePillClass : inactivePillClass}
              >
                <Layers className="h-3.5 w-3.5" />層{l}
              </Link>
            ))}
          </div>

          {/* 現在の集計モード説明 */}
          <p className="text-xs text-indigo-200">
            {mode === 'all' && '全従業員を１本に集計した全社サマリーです。'}
            {mode === 'division' && '所属部署を単位に集計しています。'}
            {mode === 'establishment' && '拠点マスタに基づき事業場単位で集計しています。'}
            {mode === 'layer' &&
              layer != null &&
              `組織ツリーの深さ ${layer} のノードを単位に、配下の全従業員を集約しています。`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* ─── KPI サマリーカード ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={`${groupUnitLabel}数`}
            value={groups.length}
            subValue={`${forAvg.length} 件が分析対象`}
            accent="indigo"
          />
          <KpiCard
            label="平均健康リスク"
            value={currentAvgRisk != null ? currentAvgRisk.toFixed(1) : '—'}
            subValue={
              riskDiff != null ? (
                <span
                  className={`flex items-center gap-0.5 ${
                    riskDiff > 0
                      ? 'text-rose-600'
                      : riskDiff < 0
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                  }`}
                >
                  {riskDiff > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : riskDiff < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  {riskDiff > 0 ? '+' : ''}
                  {riskDiff.toFixed(1)} 前回比
                </span>
              ) : (
                '全国平均=100'
              )
            }
            accent={
              currentAvgRisk == null
                ? 'slate'
                : currentAvgRisk >= 120
                  ? 'rose'
                  : currentAvgRisk >= 110
                    ? 'orange'
                    : 'indigo'
            }
          />
          <KpiCard
            label="要注意以上"
            value={cautionGroups.length}
            subValue="健康リスク 110 以上"
            accent="amber"
          />
          <KpiCard
            label="高リスク"
            value={highRiskGroups.length}
            subValue="健康リスク 120 超"
            accent="rose"
          />
        </div>

        {/* ─── マトリクスヒートマップ + 詳細パネル ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ヒートマップ（左 2/3） */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-1">組織健康度ヒートマップ</h2>
              <p className="text-xs text-slate-400 mb-4">
                行をクリックして右パネルに詳細を表示｜列ヘッダーでソート
              </p>
              <OrgHealthMatrixHeatmap
                groups={groups}
                onSelect={setSelectedGroup}
                selectedDivisionId={selectedGroup?.division_id}
              />
            </Card>
          </div>

          {/* 詳細パネル（右 1/3） */}
          <div>
            {selectedGroup ? (
              <Card className="p-6 h-full">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 leading-tight text-base">
                    {selectedGroup.name}
                  </h3>
                  {!selectedGroup.is_suppressed &&
                    selectedGroup.health_risk != null &&
                    selectedGroup.health_risk >= 120 && (
                      <Badge variant="orange" className="shrink-0">
                        高リスク
                      </Badge>
                    )}
                </div>
                <p className="text-xs text-slate-400 mb-4">対象 {selectedGroup.member_count} 名</p>

                <GroupRadarChart data={selectedGroup} />

                {/* 健康リスク大表示 */}
                <div className="mt-4 text-center py-4 rounded-xl bg-slate-50">
                  <div
                    className={`text-5xl font-bold tabular-nums ${
                      selectedGroup.is_suppressed || selectedGroup.health_risk == null
                        ? 'text-slate-400'
                        : selectedGroup.health_risk >= 120
                          ? 'text-rose-600'
                          : selectedGroup.health_risk >= 110
                            ? 'text-orange-500'
                            : selectedGroup.health_risk >= 100
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                    }`}
                  >
                    {selectedGroup.is_suppressed || selectedGroup.health_risk == null
                      ? '—'
                      : selectedGroup.health_risk}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">健康リスク（全国平均＝100）</p>
                  {!selectedGroup.is_suppressed && selectedGroup.high_stress_rate != null && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      高ストレス率 {selectedGroup.high_stress_rate}%
                    </p>
                  )}
                </div>

                {/* 前回比 */}
                {!selectedGroup.is_suppressed &&
                  selectedGroup.previous_health_risk != null &&
                  selectedGroup.health_risk != null && (
                    <div className="mt-3 text-center text-xs text-slate-500">
                      前回: <span className="font-bold">{selectedGroup.previous_health_risk}</span>
                      <span
                        className={`ml-2 font-bold ${
                          selectedGroup.health_risk - selectedGroup.previous_health_risk > 0
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {selectedGroup.health_risk - selectedGroup.previous_health_risk > 0
                          ? '↑'
                          : '↓'}
                        {Math.abs(
                          selectedGroup.health_risk - selectedGroup.previous_health_risk
                        ).toFixed(1)}
                      </span>
                    </div>
                  )}
              </Card>
            ) : (
              <Card className="p-6 h-full flex items-center justify-center text-slate-400 text-sm text-center">
                左の表の行をクリックして
                <br />
                詳細を確認できます
              </Card>
            )}
          </div>
        </div>

        {/* ─── 健康リスク推移グラフ ─── */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            健康リスク推移（期間別）
          </h2>
          <GroupTrendChart trendData={trendData} selectedDivisionId={selectedGroup?.division_id} />
        </Card>

        {/* ─── 高リスクグループ一覧 ─── */}
        {highRiskGroups.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-bold text-rose-600 flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5" />
              高リスク{groupUnitLabel}（健康リスク 120 超）
            </h2>
            <div className="space-y-2">
              {highRiskGroups.map(g => {
                const isSelected = g.division_id === selectedGroup?.division_id
                return (
                  <div
                    key={g.division_id}
                    onClick={() => setSelectedGroup(g)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-400'
                        : 'border-rose-200 bg-rose-50 hover:bg-rose-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-medium text-slate-800">{g.name}</span>
                        <span className="text-xs text-slate-500 ml-2">{g.member_count}名</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold text-rose-600">{g.health_risk}</div>
                      <div className="text-xs text-slate-500">
                        高ストレス率 {g.high_stress_rate ?? '—'}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

type AccentColor = 'indigo' | 'rose' | 'amber' | 'orange' | 'slate'

function KpiCard({
  label,
  value,
  subValue,
  accent,
}: {
  label: string
  value: string | number
  subValue: React.ReactNode
  accent: AccentColor
}) {
  const borderTop: Record<AccentColor, string> = {
    indigo: 'border-t-indigo-500',
    rose: 'border-t-rose-500',
    amber: 'border-t-amber-400',
    orange: 'border-t-orange-500',
    slate: 'border-t-slate-400',
  }
  const valueColor: Record<AccentColor, string> = {
    indigo: 'text-indigo-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
    slate: 'text-slate-600',
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 border-t-4 ${borderTop[accent]}`}
    >
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-4xl font-bold mt-1 tabular-nums ${valueColor[accent]}`}>{value}</p>
      <div className="text-xs text-slate-400 mt-1">{subValue}</div>
    </div>
  )
}
