'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { isoTimestamptzToLocalTimeInputValue, toLocalOffsetIsoFromParts } from '@/lib/datetime'
import type { OvertimeApplicationRequestBody } from '@/features/overtime/types'
import { DatePicker } from './DatePicker'
import { TimePicker } from './TimePicker'
import { TextArea } from './TextArea'

function todayYmdLocal(): string {
  const n = new Date()
  const pad = (x: number) => String(x).padStart(2, '0')
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`
}

/** 勤務日 + HH:mm をローカル日時として解釈 */
function parseLocalDateTime(dateYmd: string, timeHm: string): Date | null {
  if (!dateYmd || !timeHm) return null
  const [y, m, d] = dateYmd.split('-').map(Number)
  const tp = timeHm.split(':')
  if (tp.length < 2) return null
  const hh = Number(tp[0])
  const mm = Number(tp[1])
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  const local = new Date(y, m - 1, d, hh, mm, 0)
  return Number.isNaN(local.getTime()) ? null : local
}

function formatHoursJa(hours: number): string {
  return `${hours.toFixed(2)} 時間`
}

type FieldErrors = {
  workDate?: string
  startTime?: string
  endTime?: string
  reason?: string
}

type OvertimeApplicationFormProps = {
  /** モーダル等から開くときの初期勤務日（指定時は日付変更不可） */
  initialWorkDate?: string
  /** 既存申請の開始・終了（timestamptz ISO）。指定時は時刻入力を初期化 */
  initialOvertimeStartIso?: string | null
  initialOvertimeEndIso?: string | null
  initialReason?: string | null
  /** 申請成功後（一覧の再取得・モーダル閉鎖など） */
  onSuccess?: () => void
}

export function OvertimeApplicationForm({
  initialWorkDate,
  initialOvertimeStartIso,
  initialOvertimeEndIso,
  initialReason,
  onSuccess,
}: OvertimeApplicationFormProps) {
  const [workDate, setWorkDate] = useState(() => initialWorkDate ?? todayYmdLocal())
  const [startTime, setStartTime] = useState(() =>
    isoTimestamptzToLocalTimeInputValue(initialOvertimeStartIso ?? undefined),
  )
  const [endTime, setEndTime] = useState(() =>
    isoTimestamptzToLocalTimeInputValue(initialOvertimeEndIso ?? undefined),
  )
  const [reason, setReason] = useState(() => (initialReason?.trim() ? initialReason.trim() : ''))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** setState より先に効く連打対策 */
  const submitInFlight = useRef(false)

  const computedHours = useMemo(() => {
    const start = parseLocalDateTime(workDate, startTime)
    const end = parseLocalDateTime(workDate, endTime)
    if (!start || !end || end <= start) return null
    const diffMs = end.getTime() - start.getTime()
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
  }, [workDate, startTime, endTime])

  useEffect(() => {
    if (!success) return
    const t = window.setTimeout(() => setSuccess(null), 6000)
    return () => window.clearTimeout(t)
  }, [success])

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!workDate) next.workDate = '勤務日を選択してください'
    if (!startTime) next.startTime = '残業開始時刻を入力してください'
    if (!endTime) next.endTime = '残業終了時刻を入力してください'
    if (!reason.trim()) next.reason = '残業理由を入力してください'

    const start = parseLocalDateTime(workDate, startTime)
    const end = parseLocalDateTime(workDate, endTime)
    if (startTime && endTime && start && end && end <= start) {
      next.endTime = '終了時刻は開始時刻より後にしてください'
    }

    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitInFlight.current) return
    setFormError(null)
    setSuccess(null)

    if (!validate()) return

    const start = parseLocalDateTime(workDate, startTime)
    const end = parseLocalDateTime(workDate, endTime)
    if (!start || !end || end <= start) {
      setFieldErrors((prev) => ({
        ...prev,
        endTime: '終了時刻は開始時刻より後にしてください',
      }))
      return
    }

    let overtimeStart: string
    let overtimeEnd: string
    try {
      overtimeStart = toLocalOffsetIsoFromParts(workDate, startTime)
      overtimeEnd = toLocalOffsetIsoFromParts(workDate, endTime)
    } catch {
      setFormError('日時の組み合わせが無効です')
      return
    }

    const body: OvertimeApplicationRequestBody = {
      work_date: workDate,
      overtime_start: overtimeStart,
      overtime_end: overtimeEnd,
      reason: reason.trim(),
    }

    submitInFlight.current = true
    setSubmitting(true)
    try {
      const res = await fetch('/api/overtime/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      let message = '申請に失敗しました'
      if (res.ok) {
        setSuccess('残業申請を受け付けました。')
        setStartTime('')
        setEndTime('')
        setReason('')
        setFieldErrors({})
        if (!initialWorkDate) {
          setWorkDate(todayYmdLocal())
        }
        onSuccess?.()
        return
      }

      try {
        const data = (await res.json()) as { error?: string }
        if (data?.error) message = data.error
      } catch {
        message = res.statusText || message
      }
      setFormError(message)
    } catch {
      setFormError('通信エラーが発生しました。ネットワークを確認してください。')
    } finally {
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {success ? (
        <Alert variant="default" className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <AlertTitle>申請完了</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <DatePicker
        id="overtime-work-date"
        label="勤務日"
        value={workDate}
        onChange={setWorkDate}
        error={fieldErrors.workDate}
        disabled={submitting || !!initialWorkDate}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TimePicker
          id="overtime-start"
          label="残業開始時刻"
          value={startTime}
          onChange={setStartTime}
          error={fieldErrors.startTime}
          disabled={submitting}
        />
        <TimePicker
          id="overtime-end"
          label="残業終了時刻"
          value={endTime}
          onChange={setEndTime}
          error={fieldErrors.endTime}
          disabled={submitting}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <span className="font-medium text-slate-600">残業時間（自動計算）: </span>
        {computedHours != null ? (
          <span className="font-semibold tabular-nums">{formatHoursJa(computedHours)}</span>
        ) : (
          <span className="text-slate-500">開始・終了を入力すると表示されます</span>
        )}
      </div>

      <TextArea
        id="overtime-reason"
        label="残業理由"
        value={reason}
        onChange={setReason}
        error={fieldErrors.reason}
        disabled={submitting}
        placeholder="例: プロジェクトの納期対応"
      />

      <Button type="submit" variant="primary" disabled={submitting} fullWidth>
        {submitting ? '送信中…' : '申請する'}
      </Button>
    </form>
  )
}
