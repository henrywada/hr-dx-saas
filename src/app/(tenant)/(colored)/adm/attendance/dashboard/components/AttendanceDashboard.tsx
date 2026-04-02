'use client'

import Link from 'next/link'
import { useState } from 'react'
import { APP_ROUTES } from '@/config/routes'
import type {
  EmployeeAttendanceOverviewFilter,
  EmployeeAttendancePageResult,
  HrOvertimeAlertView,
  OverviewStats as OverviewStatsData,
} from '@/features/attendance/types'
import { Button } from '@/components/ui/Button'
import { AlertList } from './AlertList'
import { CardExplanationModal } from './CardExplanationModal'
import { EmployeeTable } from './EmployeeTable'
import { ExportButton } from './ExportButton'
import { MonthSelector } from './MonthSelector'
import { OverviewStats as OverviewStatsCards } from './OverviewStats'

type AttendanceDashboardProps = {
  year: number
  month: number
  overview: OverviewStatsData
  alertsPreview: HrOvertimeAlertView[]
  initialList: EmployeeAttendancePageResult
  divisions: { id: string; name: string }[]
  initialDetailEmployee?: { id: string; name: string } | null
}

export default function AttendanceDashboard({
  year,
  month,
  overview,
  alertsPreview,
  initialList,
  divisions,
  initialDetailEmployee = null,
}: AttendanceDashboardProps) {
  const [overviewFilter, setOverviewFilter] =
    useState<EmployeeAttendanceOverviewFilter>('all')

  return (
    <div className="space-y-8 pb-10 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="relative flex flex-row flex-wrap items-start gap-3 pl-5">
          <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              勤怠管理一覧（人事）
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              テナント内の勤怠・残業・アラートを一覧します（人事専用）。
            </p>
          </div>
          <CardExplanationModal>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              aria-label="勤怠管理一覧（人事）の統計カードの説明を開く"
            >
              カード説明
            </Button>
          </CardExplanationModal>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <MonthSelector year={year} month={month} />
          <Link
            href={APP_ROUTES.TENANT.ADMIN_CSV_ATENDANCE}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-accent-orange hover:bg-slate-50"
          >
            CSV 取り込み
          </Link>
          <ExportButton year={year} month={month} />
        </div>
      </div>

      <OverviewStatsCards
        stats={overview}
        activeFilter={overviewFilter}
        onFilterChange={setOverviewFilter}
      />

      <AlertList initialAlerts={alertsPreview} />

      <EmployeeTable
        key={`${year}-${month}-${overview.unresolvedAlertCount}-${overviewFilter}`}
        year={year}
        month={month}
        overviewFilter={overviewFilter}
        initialList={
          overviewFilter === 'all'
            ? initialList
            : { rows: [], total: 0 }
        }
        divisions={divisions}
        initialDetailEmployee={initialDetailEmployee}
      />
    </div>
  )
}
