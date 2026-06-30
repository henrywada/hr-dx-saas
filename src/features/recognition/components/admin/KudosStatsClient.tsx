'use client'

import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { KudosDivisionStat, KudosPersonalRanking, KudosValueTag, MvpCandidate } from '../../types'
import { ValueTagAdminPanel } from './ValueTagAdminPanel'
import { MvpCandidatePanel } from './MvpCandidatePanel'

interface KudosStatsClientProps {
  divisionStats: KudosDivisionStat[]
  personalRanking: KudosPersonalRanking[]
  periodDays: number
  valueTags: KudosValueTag[]
  mvpPeriodLabel: string
  mvpCandidates: MvpCandidate[]
}

const divisionColumns: Column<KudosDivisionStat>[] = [
  { key: 'division_name', label: '部署' },
  { key: 'sentCount', label: '送信件数', sortable: true },
  { key: 'receivedCount', label: '受信件数', sortable: true },
]

const personalColumns: Column<KudosPersonalRanking>[] = [
  { key: 'employee_name', label: '従業員' },
  { key: 'sentCount', label: '送信件数', sortable: true },
  { key: 'receivedCount', label: '受信件数', sortable: true },
]

export function KudosStatsClient({
  divisionStats,
  personalRanking,
  periodDays,
  valueTags,
  mvpPeriodLabel,
  mvpCandidates,
}: KudosStatsClientProps) {
  const totalSent = divisionStats.reduce((sum, stat) => sum + stat.sentCount, 0)
  const activeSenderCount = personalRanking.filter(r => r.sentCount > 0).length

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto max-w-[1920px]">
      <div>
        <h1 className="text-lg font-bold text-(--text-primary)">感謝・称賛（Kudos）集計</h1>
        <p className="text-xs text-(--text-secondary) mt-1">
          直近{periodDays}日間の部署別・個人別の送信・受信件数を集計しています。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <p className="text-xs text-(--text-secondary)">直近{periodDays}日間の称賛件数</p>
          <p className="text-2xl font-bold text-(--text-primary) mt-1">{totalSent}件</p>
        </Card>
        <Card>
          <p className="text-xs text-(--text-secondary)">称賛を送ったことのある従業員数</p>
          <p className="text-2xl font-bold text-(--text-primary) mt-1">{activeSenderCount}名</p>
        </Card>
      </div>

      <ValueTagAdminPanel tags={valueTags} />

      <MvpCandidatePanel
        periodLabel={mvpPeriodLabel}
        candidates={mvpCandidates}
        showRegisterHint
      />

      <div>
        <h2 className="text-sm font-bold text-(--text-primary) mb-2">部署別 集計</h2>
        <DataTable
          columns={divisionColumns}
          data={divisionStats}
          getRowId={item => item.division_id ?? 'unassigned'}
        />
      </div>

      <div>
        <h2 className="text-sm font-bold text-(--text-primary) mb-2">
          個人別 ランキング（上位10名）
        </h2>
        <DataTable
          columns={personalColumns}
          data={personalRanking}
          getRowId={item => item.employee_id}
        />
      </div>
    </div>
  )
}
