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
import TenantBackLink from '@/components/common/TenantBackLink'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { TabsList, TabsTrigger } from '@/components/ui/Tabs'
import OrgHealthMatrixHeatmap from './OrgHealthMatrixHeatmap'
import GroupRadarChart from './GroupRadarChart'
import GroupTrendChart from './GroupTrendChart'
import GroupYearlyDashboard from './GroupYearlyDashboard'
import type { GroupAnalysisMode } from './GroupAnalysisToolbar'
import type { GroupData, GroupTrendRow } from '../queries'
import type { YearlyDashboardYear } from '../yearly-dashboard'

interface LayerHeatmapContentProps {
  groups: GroupData[]
  trendData: GroupTrendRow[]
  mode: GroupAnalysisMode
  layer: number | null
  layers: number[]
  yearlyData: YearlyDashboardYear[]
}

function isAggregatable(g: GroupData) {
  return !g.is_suppressed && g.health_risk != null
}

function healthRiskTextColor(g: GroupData): string {
  if (g.is_suppressed || g.health_risk == null) return 'text-[#57606a]'
  if (g.health_risk >= 120) return 'text-rose-600'
  if (g.health_risk >= 110) return 'text-orange-500'
  if (g.health_risk >= 100) return 'text-amber-600'
  return 'text-emerald-600'
}

export default function LayerHeatmapContent({
  groups,
  trendData,
  mode,
  layer,
  layers,
  yearlyData,
}: LayerHeatmapContentProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null)
  const [mainTab, setMainTab] = useState<'heatmap' | 'yearly'>('heatmap')

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
    'bg-white text-[#FD7601] font-bold shadow-md px-4 py-2 rounded-xl text-sm transition-all inline-flex items-center gap-1.5'
  const inactivePillClass =
    'bg-white/20 text-white border border-white/40 hover:bg-white/30 px-4 py-2 rounded-xl text-sm transition-all font-medium inline-flex items-center gap-1.5'

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      {/* ─── グラデーションヘッダー ─── */}
      <div className="bg-gradient-to-r from-indigo-800 to-blue-600 px-4 sm:px-6 lg:px-8 pt-8 pb-6 shadow-lg">
        <div className="w-full mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">組織健康度分析</h1>
              <p className="text-[#FD7601] text-sm mt-1">
                {mainTab === 'yearly'
                  ? 'ストレスチェック集団分析｜年度別分析'
                  : 'ストレスチェック集団分析｜組織レイヤー別ヒートマップ'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0 items-center">
              <TenantBackLink variant="light" />
              <Link
                href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS}
                className="shrink-0 text-xs text-[#FD7601] hover:text-white underline underline-offset-2 transition-colors"
              >
                拠点・最低人数設定
              </Link>
            </div>
          </div>

          {/* レイヤー選択 pills（ヒートマップタブのみ） */}
          {mainTab === 'heatmap' && (
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
          )}

          {/* 現在の集計モード説明 */}
          {mainTab === 'heatmap' && (
            <p className="text-xs text-[#FD7601]">
              {mode === 'all' && '全従業員を１本に集計した全社サマリーです。'}
              {mode === 'division' && '所属部署を単位に集計しています。'}
              {mode === 'establishment' && '拠点マスタに基づき事業場単位で集計しています。'}
              {mode === 'layer' &&
                layer != null &&
                `組織ツリーの深さ ${layer} のノードを単位に、配下の全従業員を集約しています。`}
            </p>
          )}
          {mainTab === 'yearly' && (
            <p className="text-xs text-[#FD7601]">
              全社の実施回を年度ごとに最終回で集計しています。対象5名未満の年度・性別は非表示です。
            </p>
          )}
        </div>
      </div>

      <div className="w-full mx-auto px-0 py-6 space-y-6">
        <div className="px-4 sm:px-6 lg:px-8">
          <TabsList>
            <TabsTrigger selected={mainTab === 'heatmap'} onClick={() => setMainTab('heatmap')}>
              ヒートマップ
            </TabsTrigger>
            <TabsTrigger selected={mainTab === 'yearly'} onClick={() => setMainTab('yearly')}>
              年度別分析
            </TabsTrigger>
          </TabsList>
        </div>

        {mainTab === 'yearly' && <GroupYearlyDashboard years={yearlyData} />}

        {mainTab === 'heatmap' && (
          <>
            {/* ─── KPI サマリーカード ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                            : 'text-[#57606a]'
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

            {/* ─── マトリクスヒートマップ ─── */}
            <Card className="p-4 sm:p-5">
              <h2 className="text-lg font-bold text-[#24292f] mb-1">組織健康度ヒートマップ</h2>
              <p className="text-xs text-[#57606a] mb-3">
                行をクリックすると下の比較チャートで該当{groupUnitLabel}
                をハイライトします｜列ヘッダーでソート
              </p>
              <OrgHealthMatrixHeatmap
                groups={groups}
                onSelect={setSelectedGroup}
                selectedDivisionId={selectedGroup?.division_id}
              />
            </Card>

            {/* ─── 全チャート比較 ─── */}
            <Card className="p-4 sm:p-5">
              <h2 className="text-lg font-bold text-[#24292f] mb-1">
                全{groupUnitLabel}チャート比較
              </h2>
              <p className="text-xs text-[#57606a] mb-3">
                {groupUnitLabel}ごとの職場環境尺度を並べて比較できます
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {groups.map(g => {
                  const isSelected = g.division_id === selectedGroup?.division_id
                  const riskDiffValue =
                    !g.is_suppressed && g.previous_health_risk != null && g.health_risk != null
                      ? g.health_risk - g.previous_health_risk
                      : null

                  return (
                    <div
                      key={g.division_id}
                      onClick={() => setSelectedGroup(g)}
                      className={`rounded-lg border bg-white shadow-xs p-5 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-400 ring-2 ring-indigo-400'
                          : 'border-[#e2e6ec] hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-[#24292f] leading-tight text-sm">{g.name}</h3>
                        {!g.is_suppressed && g.health_risk != null && g.health_risk >= 120 && (
                          <Badge variant="orange" className="shrink-0">
                            高リスク
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#57606a] mb-3">対象 {g.member_count} 名</p>

                      <GroupRadarChart data={g} />

                      <div className="mt-3 text-center py-3 rounded-xl bg-[#f6f8fa]">
                        <div
                          className={`text-3xl font-bold tabular-nums ${healthRiskTextColor(g)}`}
                        >
                          {g.is_suppressed || g.health_risk == null ? '—' : g.health_risk}
                        </div>
                        <p className="text-xs text-[#57606a] mt-1">健康リスク（全国平均＝100）</p>
                        {!g.is_suppressed && g.high_stress_rate != null && (
                          <p className="text-xs text-[#57606a] mt-0.5">
                            高ストレス率 {g.high_stress_rate}%
                          </p>
                        )}
                      </div>

                      {riskDiffValue != null && (
                        <div className="mt-2 text-center text-xs text-[#57606a]">
                          前回: <span className="font-bold">{g.previous_health_risk}</span>
                          <span
                            className={`ml-2 font-bold ${
                              riskDiffValue > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {riskDiffValue > 0 ? '↑' : '↓'}
                            {Math.abs(riskDiffValue).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {groups.length === 0 && (
                <div className="py-12 text-center text-[#57606a] text-sm">
                  表示できるデータがありません
                </div>
              )}
            </Card>

            {/* ─── 健康リスク推移グラフ ─── */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#24292f] mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#FD7601]" />
                健康リスク推移（期間別）
              </h2>
              <GroupTrendChart
                trendData={trendData}
                selectedDivisionId={selectedGroup?.division_id}
              />
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
                            ? 'border-[#e2e6ec] bg-[#f6f8fa] ring-2 ring-indigo-400'
                            : 'border-rose-200 bg-rose-50 hover:bg-rose-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-medium text-[#24292f]">{g.name}</span>
                            <span className="text-xs text-[#57606a] ml-2">{g.member_count}名</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-rose-600">{g.health_risk}</div>
                          <div className="text-xs text-[#57606a]">
                            高ストレス率 {g.high_stress_rate ?? '—'}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </>
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
    indigo: 'text-[#FD7601]',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    orange: 'text-orange-600',
    slate: 'text-[#57606a]',
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-[#e2e6ec] shadow-sm p-5 border-t-4 ${borderTop[accent]}`}
    >
      <p className="text-xs text-[#57606a] font-medium">{label}</p>
      <p className={`text-4xl font-bold mt-1 tabular-nums ${valueColor[accent]}`}>{value}</p>
      <div className="text-xs text-[#57606a] mt-1">{subValue}</div>
    </div>
  )
}
