'use client'

import { useMemo, useState } from 'react'
import { EngagementScoreCards } from './EngagementScoreCards'
import { GrowthDevelopmentCards } from './GrowthDevelopmentCards'
import { MonthlyTrendChart } from './MonthlyTrendChart'
import { DepartmentHeatmap } from './DepartmentHeatmap'
import { RecordSnapshotButton } from './RecordSnapshotButton'
import type { EngagementDashboardData } from '../types'

interface Props {
  data: EngagementDashboardData
}

export function EngagementDashboard({ data }: Props) {
  const availableLayers = useMemo(() => {
    const layers = new Set<number>()
    for (const d of data.departments) {
      if (d.layer !== null) layers.add(d.layer)
    }
    return Array.from(layers).sort((a, b) => a - b)
  }, [data.departments])

  const [selectedLayer, setSelectedLayer] = useState<number | 'all'>('all')

  const filteredDepartments =
    selectedLayer === 'all'
      ? data.departments
      : data.departments.filter(d => d.layer === selectedLayer)

  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイル準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/engagement — 統合エンゲージメントダッシュボード
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              統合エンゲージメントダッシュボード
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              パルスサーベイ・ストレスチェック・Echoアンケートに加え、評価・1on1・スキル・eラーニングの成長KPIを統合表示
            </p>
          </div>
          <RecordSnapshotButton layerFilter={selectedLayer} />
        </div>

        {/* カード本文 */}
        <div className="space-y-8 p-6">
          {/* 3ソース最新スコアカード */}
          <EngagementScoreCards
            latestPulseScore={data.latestPulseScore}
            latestPulsePeriod={data.latestPulsePeriod}
            latestHighStressRate={data.latestHighStressRate}
            latestQuestionnaireResponseRate={data.latestQuestionnaireResponseRate}
          />

          {/* 成長・育成KPI（1on1/評価/スキル/eラーニング） */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-700">
              成長・育成KPI（評価 / 1on1 / スキル / eラーニング）
            </h2>
            <GrowthDevelopmentCards kpi={data.growthKpi} />
          </section>

          {/* 月次推移グラフ */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-gray-700">推移グラフ</h2>
            {!data.hasPulseData && !data.hasStressData && !data.hasQuestionnaireData ? (
              <div className="flex h-48 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400">
                データなし — まずは各機能でデータを入力してください
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <MonthlyTrendChart
                  pulseTrend={data.pulseTrend}
                  stressTrend={data.stressTrend}
                  questionnaireTrend={data.questionnaireTrend}
                />
              </div>
            )}
          </section>

          {/* 部署別ヒートマップ */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-700">
                部署別エンゲージメント（最新期）
              </h2>
              {availableLayers.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedLayer('all')}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedLayer === 'all'
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    すべて
                  </button>
                  {availableLayers.map(layer => (
                    <button
                      key={layer}
                      onClick={() => setSelectedLayer(layer)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selectedLayer === layer
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      階層{layer}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <DepartmentHeatmap departments={filteredDepartments} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
