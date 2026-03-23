'use client'

import type { WorkTimeRecordRow } from '@/features/attendance/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatTimeInJSTFromIso } from '@/lib/datetime'

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}時間${m}分`
}

function sourceLabel(source: string | null): string {
  const s = (source ?? '').toLowerCase()
  if (s === 'qr') return 'QRコード打刻'
  if (s === 'csv') return 'CSV取り込み'
  if (s === 'pc_log' || s === 'pc') return 'PC端末ログ'
  return source && source.length > 0 ? source : '—'
}

type Props = {
  workDate: string | null
  record: WorkTimeRecordRow | null
}

export function DailyRecordCard({ workDate, record }: Props) {
  if (!workDate) {
    return (
      <Card variant="default" title="日別の記録">
        <p className="text-sm text-slate-500">カレンダーから日付を選択してください。</p>
      </Card>
    )
  }

  if (!record) {
    return (
      <Card variant="default" title={`${workDate} の記録`}>
        <p className="text-sm font-medium text-slate-600">記録なし</p>
      </Card>
    )
  }

  const start = formatTimeInJSTFromIso(record.start_time)
  const end = formatTimeInJSTFromIso(record.end_time)
  const range =
    start && end ? `${start} - ${end}` : start || end || '—'

  return (
    <Card variant="default" title={`${record.record_date} の詳細`}>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-500 text-xs mb-0.5">出勤時刻</dt>
          <dd className="font-medium text-slate-900">{start ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 text-xs mb-0.5">退勤時刻</dt>
          <dd className="font-medium text-slate-900">{end ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500 text-xs mb-0.5">休憩時間</dt>
          <dd className="font-medium text-slate-600">スキーマに項目なし</dd>
        </div>
        <div>
          <dt className="text-slate-500 text-xs mb-0.5">実働時間（相当）</dt>
          <dd className="font-medium text-slate-900">
            {formatMinutes(record.duration_minutes)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 text-xs mb-0.5">残業時間（日次）</dt>
          <dd className="font-medium text-slate-600">スキーマに項目なし（月次を参照）</dd>
        </div>
        <div>
          <dt className="text-slate-500 text-xs mb-0.5">休日出勤（日次）</dt>
          <dd className="font-medium text-slate-900">
            {record.is_holiday ? '休日フラグあり' : '—'}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500 text-xs mb-0.5">データソース</dt>
          <dd className="mt-1">
            <Badge variant="neutral">{sourceLabel(record.source)}</Badge>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500 text-xs mb-0.5">備考</dt>
          <dd className="font-medium text-slate-600">—</dd>
        </div>
        <div className="sm:col-span-2 text-xs text-slate-400">
          時刻レンジ: {range}
        </div>
      </dl>
    </Card>
  )
}
