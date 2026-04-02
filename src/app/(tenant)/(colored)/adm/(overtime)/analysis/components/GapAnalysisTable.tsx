'use client'

import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { AnalysisCardHeaderRow } from './AnalysisCardHeaderRow'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { GapItem } from '@/app/api/analysis/gap/route'
import { analysisJsonFetcher } from './analysis-fetcher'

type GapResponse = { gaps: GapItem[] }

const GAP_CARD_TITLE = '残業（申請 vs 実績）乖離'
const GAP_SUBLINE =
  '残業（実績）= (開始時間 - 終了時間)ー(８時間)'

type GapAnalysisTableProps = {
  yearMonth: string
}

export function GapAnalysisTable({ yearMonth }: GapAnalysisTableProps) {
  const key = `/api/analysis/gap?year_month=${encodeURIComponent(yearMonth)}`
  const { data, error, isLoading } = useSWR<GapResponse>(key, () => analysisJsonFetcher<GapResponse>(key))

  if (isLoading) {
    return (
      <Card className="!p-4">
        <AnalysisCardHeaderRow title={GAP_CARD_TITLE} yearMonth={yearMonth} sublineRight={GAP_SUBLINE} />
        <Skeleton className="h-52 w-full" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="!p-4">
        <AnalysisCardHeaderRow title={GAP_CARD_TITLE} yearMonth={yearMonth} sublineRight={GAP_SUBLINE} />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error.message}
        </div>
      </Card>
    )
  }

  const rows = [...(data?.gaps ?? [])].sort((a, b) => Math.abs(b.gap_hours) - Math.abs(a.gap_hours))

  return (
    <Card className="!p-4">
      <AnalysisCardHeaderRow title={GAP_CARD_TITLE} yearMonth={yearMonth} sublineRight={GAP_SUBLINE} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>社員名</TableHead>
            <TableHead className="text-right">残業時間（申請）</TableHead>
            <TableHead className="text-right">残業時間（実績）</TableHead>
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
