'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { AnalysisCardHeaderRow } from './AnalysisCardHeaderRow'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TabsList, TabsTrigger } from '@/components/ui/Tabs'
import type { RiskEmployee } from '@/app/api/analysis/risk-employees/route'
import { analysisJsonFetcher } from './analysis-fetcher'

type EmployeesResponse = { employees: RiskEmployee[] }

type RiskEmployeeTableProps = {
  yearMonth: string
}

type TabKey = 'all' | '違反' | '警告' | '注意'

function riskBadgeClass(level: RiskEmployee['risk_level']): string {
  switch (level) {
    case '違反':
      return '!bg-red-100 !text-red-800'
    case '警告':
      return '!bg-orange-100 !text-orange-800'
    case '注意':
      return '!bg-amber-100 !text-amber-900'
    case '正常':
    default:
      return '!bg-emerald-100 !text-emerald-900'
  }
}

function buildRiskUrl(yearMonth: string, tab: TabKey): string {
  const base = `/api/analysis/risk-employees?year_month=${encodeURIComponent(yearMonth)}`
  if (tab === 'all') return base
  return `${base}&risk_level=${encodeURIComponent(tab)}`
}

export function RiskEmployeeTable({ yearMonth }: RiskEmployeeTableProps) {
  const [tab, setTab] = useState<TabKey>('all')

  const key = buildRiskUrl(yearMonth, tab)
  const { data, error, isLoading } = useSWR<EmployeesResponse>(key, () =>
    analysisJsonFetcher<EmployeesResponse>(key),
  )

  const rows = useMemo(() => data?.employees ?? [], [data?.employees])

  if (isLoading) {
    return (
      <Card className="!p-4">
        <AnalysisCardHeaderRow title="36協定リスク社員" yearMonth={yearMonth} />
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="!p-4">
        <AnalysisCardHeaderRow title="36協定リスク社員" yearMonth={yearMonth} />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error.message}
        </div>
      </Card>
    )
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: '全員' },
    { key: '違反', label: '違反' },
    { key: '警告', label: '警告' },
    { key: '注意', label: '注意' },
  ]

  return (
    <Card className="!p-4">
      <AnalysisCardHeaderRow title="36協定リスク社員" yearMonth={yearMonth} />
      <div className="mb-4">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.key} selected={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>社員名</TableHead>
            <TableHead>部署</TableHead>
            <TableHead className="text-right">残業時間</TableHead>
            <TableHead className="text-right">上限</TableHead>
            <TableHead className="min-w-[8rem]">使用率</TableHead>
            <TableHead>リスク</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-500">
                該当者はいません
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.employee_id}>
                <TableCell className="font-medium">{row.employee_name}</TableCell>
                <TableCell>{row.department_name || '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{row.total_overtime_hours} h</TableCell>
                <TableCell className="text-right tabular-nums">{row.monthly_limit} h</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-slate-600"
                        style={{ width: `${Math.min(row.usage_rate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-slate-600">{row.usage_rate}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="neutral" className={cn('border-0', riskBadgeClass(row.risk_level))}>
                    {row.risk_level}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
