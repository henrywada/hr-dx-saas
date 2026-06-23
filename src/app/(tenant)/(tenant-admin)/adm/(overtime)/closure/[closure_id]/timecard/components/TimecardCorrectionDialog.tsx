'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from './input'
import { Textarea } from './textarea'
import type { AnomalyListItem } from './types'

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function datetimeLocalToIso(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error('invalid datetime')
  return d.toISOString()
}

type Props = {
  closureId: string
  row: AnomalyListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCorrected: () => Promise<void> | void
}

export function TimecardCorrectionDialog({
  closureId,
  row,
  open,
  onOpenChange,
  onCorrected,
}: Props) {
  const [startLocal, setStartLocal] = useState('')
  const [endLocal, setEndLocal] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !row) return
    const d = row.details as { start_time?: string; end_time?: string } | null
    setStartLocal(isoToDatetimeLocal(d?.start_time ?? null))
    setEndLocal(isoToDatetimeLocal(d?.end_time ?? null))
    setReason('')
    setError(null)
  }, [open, row])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!row) return
    setError(null)
    let correctedStartIso: string
    let correctedEndIso: string
    try {
      correctedStartIso = datetimeLocalToIso(startLocal)
      correctedEndIso = datetimeLocalToIso(endLocal)
    } catch {
      setError('出勤・退勤の日時形式が正しくありません')
      return
    }
    if (new Date(correctedEndIso) <= new Date(correctedStartIso)) {
      setError('退勤は出勤より後に設定してください')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/adm/closure/${closureId}/timecard-correction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_time_record_id: row.work_time_record_id,
          corrected_start_iso: correctedStartIso,
          corrected_end_iso: correctedEndIso,
          reason: reason.trim(),
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? '修正に失敗しました')
        return
      }
      onOpenChange(false)
      await onCorrected()
    } catch {
      setError('通信に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>打刻の修正</DialogTitle>
          <p className="text-sm text-neutral-500">
            正しい出勤・退勤時刻と修正理由を入力してください。
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 pt-2 sm:px-8">
          {row && (
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-800">{row.employee_name}</span>
              {' · '}
              {row.record_date}
            </p>
          )}
          <div className="space-y-2">
            <label htmlFor="tc-start" className="text-sm font-medium text-neutral-800">
              出勤（修正後）
            </label>
            <Input
              id="tc-start"
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="tc-end" className="text-sm font-medium text-neutral-800">
              退勤（修正後）
            </label>
            <Input
              id="tc-end"
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="tc-reason" className="text-sm font-medium text-neutral-800">
              修正理由
            </label>
            <Textarea
              id="tc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例: 打刻忘れのため手入力で補正"
              required
              maxLength={2000}
              disabled={submitting}
            />
          </div>
          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? '保存中…' : '修正を保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
