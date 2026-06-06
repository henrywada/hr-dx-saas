'use client'

import { useState } from 'react'
import { ObjectiveCard } from './ObjectiveCard'
import { ObjectiveFormModal } from './ObjectiveFormModal'
import { CheckinFormModal } from './CheckinFormModal'
import { AchievementRateChart } from './AchievementRateChart'
import type { OkrDashboardData, DivisionAchievementRow } from '../types'

type TabKey = 'company' | 'division' | 'my' | 'team'

const TAB_LABELS: Record<TabKey, string> = {
  company: '会社目標',
  division: '部門目標',
  my: '個人目標',
  team: 'チーム',
}

interface Employee {
  id: string
  name: string
}

interface Props {
  data: OkrDashboardData
  fiscalYear: number
  isAdmin: boolean
  employees: Employee[]
  divisionAchievements: DivisionAchievementRow[]
}

interface CheckinState {
  krId: string
  krTitle: string
  krType: string
  targetValue: number | null
  unit: string | null
}

export function OkrDashboard({
  data,
  fiscalYear,
  isAdmin,
  employees,
  divisionAchievements,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('company')
  const [addOpen, setAddOpen] = useState(false)
  const [checkinState, setCheckinState] = useState<CheckinState | null>(null)

  const tabObjectives = {
    company: data.companyObjectives,
    division: data.divisionObjectives,
    my: data.myObjectives,
    team: data.teamObjectives,
  }

  const currentObjectives = tabObjectives[activeTab]

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/okr — OKR・目標管理
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">OKR・目標管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              {fiscalYear}年度 — 目標の設定・進捗管理・評価連動
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setAddOpen(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 transition-colors"
            >
              + 目標を追加
            </button>
          )}
        </div>

        {/* カード本文 */}
        <div className="space-y-8 p-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">目標数</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {data.summary.totalObjectives}
                <span className="ml-1 text-sm font-normal text-gray-400">件</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">進行中</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {data.summary.activeObjectives}
                <span className="ml-1 text-sm font-normal text-gray-400">件</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">達成済</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {data.summary.completedObjectives}
                <span className="ml-1 text-sm font-normal text-gray-400">件</span>
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">平均進捗</p>
              <p
                className={`mt-2 text-3xl font-bold ${
                  data.summary.averageProgress >= 70
                    ? 'text-green-600'
                    : data.summary.averageProgress >= 40
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {data.summary.averageProgress}
                <span className="ml-1 text-sm font-normal text-gray-400">%</span>
              </p>
            </div>
          </div>

          {/* タブ */}
          <div className="-mx-6 flex gap-2 border-b border-gray-200 bg-white px-6 pb-0 pt-1">
            {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => {
              const count = tabObjectives[tab].length
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`mb-[-1px] rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border border-b-white border-gray-200 bg-white text-primary'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {TAB_LABELS[tab]}
                  {count > 0 && (
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                        isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* 目標一覧 */}
          {currentObjectives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-gray-400">このタブには目標がありません</p>
              {isAdmin && activeTab === 'company' && (
                <button
                  onClick={() => setAddOpen(true)}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  最初の目標を追加する
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {currentObjectives.map(obj => (
                <ObjectiveCard
                  key={obj.id}
                  objective={obj}
                  onCheckin={(krId, krTitle, krType, targetValue, unit) =>
                    setCheckinState({ krId, krTitle, krType, targetValue, unit })
                  }
                />
              ))}
            </div>
          )}

          {/* 部署別達成率チャート */}
          {divisionAchievements.length > 0 && (
            <section>
              <h2 className="mb-3 text-base font-semibold text-gray-700">部署別 平均達成率</h2>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <AchievementRateChart data={divisionAchievements} />
              </div>
            </section>
          )}
        </div>
      </div>

      {/* 目標追加モーダル */}
      <ObjectiveFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fiscalYear={fiscalYear}
        divisions={data.divisions}
        employees={employees}
      />

      {/* チェックインモーダル */}
      {checkinState && (
        <CheckinFormModal
          open={true}
          onClose={() => setCheckinState(null)}
          keyResultId={checkinState.krId}
          keyResultTitle={checkinState.krTitle}
          krType={checkinState.krType}
          targetValue={checkinState.targetValue}
          unit={checkinState.unit}
        />
      )}
    </div>
  )
}
