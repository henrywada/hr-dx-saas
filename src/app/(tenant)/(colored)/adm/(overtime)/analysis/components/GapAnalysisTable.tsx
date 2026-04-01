'use client'

import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { GapItem } from '@/app/api/analysis/gap/route'
import { analysisJsonFetcher } from './analysis-fetcher'

type GapResponse = { gaps: GapItem[] }

type GapAnalysisTableProps = {
  yearMonth: string
}

export function GapAnalysisTable({ yearMonth }: GapAnalysisTableProps) {
  const key = `/api/analysis/gap?year_month=${encodeURIComponent(yearMonth)}`
  const { data, error, isLoading } = useSWR<GapResponse>(key, () => analysisJsonFetcher<GapResponse>(key))

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

  const rows = [...(data?.gaps ?? [])].sort((a, b) => Math.abs(b.gap_hours) - Math.abs(a.gap_hours))

  return (
    <Card title="申請 vs 実績 乖離" className="!p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>社員名</TableHead>
            <TableHead className="text-right">申請時間</TableHead>
            <TableHead className="text-right">実績時間</TableHead>
            <TableHead className="text-right">乖離</TableHead>
            <TableHead>判定</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-slate-500">
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.employee_id}
                className={row.gap_type === '未申請残業あり' ? 'bg-orange-50/90' : undefined}
              >
                <TableCell className="font-medium">{row.employee_name}</TableCell>
                <TableCell className="text-right tabular-nums">{row.approved_hours} h</TableCell>
                <TableCell className="text-right tabular-nums">{row.actual_hours} h</TableCell>
                <TableCell className="text-right tabular-nums">{row.gap_hours} h</TableCell>
                <TableCell>{row.gap_type}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}
