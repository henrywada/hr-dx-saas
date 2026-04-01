'use client'

import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DepartmentSummary } from '@/app/api/analysis/departments/route'
import { analysisJsonFetcher } from './analysis-fetcher'

type DepartmentsResponse = { departments: DepartmentSummary[] }

type DepartmentRankingTableProps = {
  yearMonth: string
}

export function DepartmentRankingTable({ yearMonth }: DepartmentRankingTableProps) {
  const key = `/api/analysis/departments?year_month=${encodeURIComponent(yearMonth)}`
  const { data, error, isLoading } = useSWR<DepartmentsResponse>(key, () =>
    analysisJsonFetcher<DepartmentsResponse>(key),
  )

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error.message}
      </div>
    )
  }

  const sorted = [...(data?.departments ?? [])].sort((a, b) => b.avg_overtime - a.avg_overtime)

  return (
    <Card title="部署別ランキング" className="!p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>部署名</TableHead>
            <TableHead className="text-right">社員数</TableHead>
            <TableHead className="text-right">平均残業</TableHead>
            <TableHead className="text-right">最大残業</TableHead>
            <TableHead className="text-right">違反者数</TableHead>
            <TableHead className="text-right">警告者数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-500">
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((row) => (
              <TableRow
                key={`${row.department_id}-${row.department_name}`}
                className={row.violation_count > 0 ? 'bg-red-50/90' : undefined}
              >
                <TableCell className="font-medium">{row.department_name || '（未所属）'}</TableCell>
                <TableCell className="text-right tabular-nums">{row.employee_count}</TableCell>
                <TableCell className="text-right tabular-nums">{row.avg_overtime} h</TableCell>
                <TableCell className="text-right tabular-nums">{row.max_overtime} h</TableCell>
                <TableCell className="text-right tabular-nums">{row.violation_count}</TableCell>
                <TableCell className="text-right tabular-nums">{row.warning_count}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
