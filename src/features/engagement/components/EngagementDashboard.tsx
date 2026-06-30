'use client'

import { EngagementScoreCards } from './EngagementScoreCards'
import { GrowthDevelopmentCards } from './GrowthDevelopmentCards'
import { MonthlyTrendChart } from './MonthlyTrendChart'
import { DepartmentHeatmap } from './DepartmentHeatmap'
import type { EngagementDashboardData } from '../types'

interface Props {
  data: EngagementDashboardData
}

export function EngagementDashboard({ data }: Props) {
  return (
    <div className="p-6">
      {/* メインカード（admin-card-and-table.md スタイル準拠） */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/engagement — 統合エンゲージメントダッシュボード
        </div>

        {/* カードヘッダー */}
        <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            統合エンゲージメントダッシュボード
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            パルスサーベイ・ストレスチェック・Echoアンケートに加え、評価・1on1・スキル・eラーニングの成長KPIを統合表示
          </p>
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
            <h2 className="mb-3 text-base font-semibold text-gray-700">
              部署別エンゲージメント（最新期）
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <DepartmentHeatmap departments={data.departments} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
