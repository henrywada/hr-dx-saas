'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, Users } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import GroupAnalysisHeatMap from './GroupAnalysisHeatMap'
import GroupRadarChart from './GroupRadarChart'
import GroupTrendChart from './GroupTrendChart'
import { GroupAnalysisHelpModalTrigger } from './GroupAnalysisHelpModal'
import GroupAnalysisToolbar from './GroupAnalysisToolbar'
import type { GroupAnalysisMode } from './GroupAnalysisToolbar'
import type { GroupData, GroupTrendRow } from '../queries'

function isAggregatableGroup(g: GroupData) {
  return !g.is_suppressed && g.health_risk != null
}

interface GroupAnalysisContentProps {
  groups: GroupData[]
  trendData: GroupTrendRow[]
  mode: GroupAnalysisMode
  layer: number | null
  layers: number[]
}

export default function GroupAnalysisContent({
  groups,
  trendData,
  mode,
  layer,
  layers,
}: GroupAnalysisContentProps) {
  const [selectedDivision, setSelectedDivision] = useState<GroupData | null>(
    groups.length > 0 ? groups[0] : null
  )

  const highRiskGroups = groups.filter(
    (g) => g.health_risk != null && g.health_risk > 120 && !g.is_suppressed
  )

  const forAvg = groups.filter(isAggregatableGroup)
  const totalMembers = forAvg.reduce((s, g) => s + g.member_count, 0)
  const currentAvgRisk =
    totalMembers > 0
      ? forAvg.reduce((s, g) => s + (g.health_risk as number) * g.member_count, 0) / totalMembers
      : 0
  const prevRows = forAvg.filter((g) => g.previous_health_risk != null)
  const prevTotalMembers = prevRows.reduce((s, g) => s + g.member_count, 0)
  const previousAvgRisk =
    prevTotalMembers > 0
      ? prevRows.reduce(
          (s, g) => s + (g.previous_health_risk as number) * g.member_count,
          0
        ) / prevTotalMembers
      : null
  const riskDiff =
    previousAvgRisk != null && totalMembers > 0 ? currentAvgRisk - previousAvgRisk : null

  const groupUnitLabel =
    mode === 'establishment' ? '拠点' : mode === 'layer' ? 'グループ' : '部署'
  const heatTitle =
    mode === 'establishment'
      ? '拠点別健康リスク・ヒートマップ（全国平均比）'
      : mode === 'layer'
        ? `レイヤー ${layer ?? ''} 別 健康リスク・ヒートマップ（全国平均比）`
        : '部署別健康リスク・ヒートマップ（全国平均比）'

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">集団分析ダッシュボード</h1>
          <p className="text-gray-600 mt-1">第8章準拠｜部署別ストレス状況・職場環境改善支援</p>
        </div>
        <div className="shrink-0">
          <GroupAnalysisHelpModalTrigger />
        </div>
      </div>

      <Card className="p-4">
        <GroupAnalysisToolbar mode={mode} layer={layer} layers={layers} />
        <p className="text-xs text-slate-400 mt-3">
          拠点マスタ・最低人数設定は{' '}
          <Link
            href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS}
            className="text-blue-600 hover:underline"
          >
            拠点（事業場）設定
          </Link>
          から行えます。
        </p>
      </Card>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-gray-500">{groupUnitLabel}数</p>
          <p className="text-4xl font-bold">{groups.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">平均健康リスク</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-4xl font-bold text-blue-600">
              {totalMembers > 0 ? currentAvgRisk.toFixed(1) : '—'}
            </p>
            {riskDiff != null && (
              <span
                className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                  riskDiff > 0
                    ? 'bg-red-100 text-red-700'
                    : riskDiff < 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {riskDiff > 0 ? '↑' : riskDiff < 0 ? '↓' : '→'}{' '}
                {Math.abs(riskDiff).toFixed(1)} 前回比
              </span>
            )}
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-500">高リスク{groupUnitLabel}</p>
          <p className="text-4xl font-bold text-red-600">{highRiskGroups.length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">{heatTitle}</h2>
            <GroupAnalysisHeatMap
              groups={groups}
              onSelect={setSelectedDivision}
              selectedDivisionId={selectedDivision?.division_id}
              highlightThreshold={120}
            />
          </Card>
        </div>

        <div>
          {selectedDivision && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">{selectedDivision.name}</h3>
                {selectedDivision.health_risk != null &&
                  selectedDivision.health_risk > 120 &&
                  !selectedDivision.is_suppressed && (
                    <Badge variant="orange">高リスク</Badge>
                  )}
              </div>
              <p className="text-sm text-gray-500 text-left mb-4">
                ● ヒートマップをクリックして選択してください
              </p>
              <GroupRadarChart data={selectedDivision} />
              <div className="text-center mt-6">
                <div className="text-5xl font-bold text-blue-600">
                  {selectedDivision.is_suppressed || selectedDivision.health_risk == null
                    ? '—'
                    : selectedDivision.health_risk}
                </div>
                <p className="text-sm text-gray-500">健康リスク（全国平均＝100）</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">健康リスク推移（期間別）</h2>
        <GroupTrendChart
          trendData={trendData}
          selectedDivisionId={selectedDivision?.division_id}
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-red-600 mb-4">
          <AlertTriangle className="h-5 w-5" />
          高リスク{groupUnitLabel}（健康リスク120超）
        </h2>
        {highRiskGroups.length > 0 ? (
          <div className="space-y-3">
            {highRiskGroups.map((g) => {
              const isSelected = g.division_id === selectedDivision?.division_id
              return (
                <div
                  key={g.division_id}
                  onClick={() => setSelectedDivision(g)}
                  className={`flex justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'ring-2 ring-blue-400 bg-blue-50 border-blue-200'
                      : 'hover:bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-red-600" />
                    {g.name}（{g.member_count}名）
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">{g.health_risk}</div>
                    <div className="text-xs">高ストレス率 {g.high_stress_rate ?? '—'}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 py-4">高リスク{groupUnitLabel}はありません</p>
        )}
      </Card>
    </div>
  )
}
