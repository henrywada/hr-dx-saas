'use client'

import Link from 'next/link'
import { ClosureStatusBadge } from '../../components/ClosureStatusBadge'
import { ClosureActionPanel } from './ClosureActionPanel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/table'
import { formatDateTimeInJST } from '@/lib/datetime'
import type { Tables } from '@/lib/supabase/types'

type ClosureRow = Tables<'monthly_overtime_closures'>
type MeoRow = Tables<'monthly_employee_overtime'> & { employee_name: string }

type Props = {
  closure: ClosureRow
  aggregateRows: MeoRow[]
}

function fmtHours(n: number | null | undefined) {
  if (n === null || n === undefined) return ''
  return Number(n).toFixed(2)
}

export function ClosureDetailClient({ closure, aggregateRows }: Props) {
  const ym = closure.year_month.slice(0, 7)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href="/adm/closure" className="text-sm text-primary hover:underline">
            ← 一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900">月次締め {ym}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <ClosureStatusBadge status={closure.status} />
            <Link
              href={`/adm/closure/${closure.id}/timecard`}
              className="text-sm font-medium text-primary hover:underline"
            >
              打刻修正画面へ
            </Link>
          </div>
          <dl className="grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
            <div>
              <dt className="text-neutral-500">集計日時</dt>
              <dd className="font-mono text-neutral-800">
                {closure.aggregated_at ? formatDateTimeInJST(closure.aggregated_at) : ''}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">集計バージョン</dt>
              <dd className="font-mono text-neutral-800">{closure.aggregate_version ?? ''}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">ロック理由</dt>
              <dd className="text-neutral-800">{closure.lock_reason?.trim() ? closure.lock_reason : ''}</dd>
            </div>
          </dl>
        </div>
        <div className="min-w-[240px] rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">操作</p>
          <ClosureActionPanel closureId={closure.id} status={closure.status} />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">社員別集計</h2>
        <p className="text-sm text-neutral-500">残業(h) は承認済み残業申請に基づく時間です。</p>
        {aggregateRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
            集計データがありません。「集計を実行」で作成されます。
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>社員</TableHead>
                <TableHead className="text-right">総労働(h)</TableHead>
                <TableHead className="text-center">残業(h)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregateRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.employee_name}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtHours(row.total_work_hours)}</TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {fmtHours(row.approved_overtime_hours)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
