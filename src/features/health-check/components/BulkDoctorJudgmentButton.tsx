'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { bulkApplyStandardToDoctorJudgment } from '@/features/health-check/actions'
import type { EmploymentJudgment } from '@/features/health-check/types'

type Candidate = {
  employee_name: string
  overall_standard_code: string
}

const inputClass = 'mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300'

const BULK_EMPLOYMENT_OPTIONS: { value: EmploymentJudgment; label: string }[] = [
  { value: 'hold', label: '保留' },
  { value: 'fit', label: '通常勤務' },
  { value: 'restricted', label: '就業制限' },
  { value: 'leave', label: '要休業' },
]

export function BulkDoctorJudgmentButton({
  campaignId,
  candidates,
}: {
  campaignId: string | null
  candidates: Candidate[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [standardCode, setStandardCode] = useState('')
  const [doctorJudgmentCode, setDoctorJudgmentCode] = useState('')
  const [employmentJudgment, setEmploymentJudgment] = useState<'' | EmploymentJudgment>('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const matchKey = standardCode.trim()
  const matched = useMemo(
    () => (matchKey ? candidates.filter(r => r.overall_standard_code.trim() === matchKey) : []),
    [candidates, matchKey]
  )
  const canSubmit = Boolean(
    campaignId && matchKey && doctorJudgmentCode.trim() && employmentJudgment && matched.length > 0
  )

  return (
    <>
      <Button type="button" size="sm" disabled={!campaignId} onClick={() => setOpen(true)}>
        一括判定
      </Button>
      <Dialog
        open={open}
        onOpenChange={next => {
          setOpen(next)
          if (next) {
            setMessage(null)
            setStandardCode('')
            setDoctorJudgmentCode('')
            setEmploymentJudgment('')
          }
        }}
      >
        <DialogContent className="max-h-[80vh] max-w-[560px] flex flex-col gap-0 overflow-hidden rounded-lg p-0">
          <DialogHeader className="rounded-t-lg">
            <DialogTitle>一括判定</DialogTitle>
            <p className="sr-only">
              標準総合判定が一致する未判定者へ、産業医判定を一括設定します。
            </p>
          </DialogHeader>
          <div className="px-6 py-4 space-y-3 text-xs text-slate-700 shrink-0">
            <p>
              未判定のうち、<span className="font-semibold">標準総合判定</span>が一致する人へ
              <span className="font-semibold">産業医判定</span>を一括で設定します。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                標準総合判定
                <input
                  value={standardCode}
                  onChange={e => setStandardCode(e.target.value)}
                  placeholder="例: B1"
                  className={inputClass}
                />
              </label>
              <div className="space-y-3">
                <label className="block">
                  産業医判定
                  <input
                    value={doctorJudgmentCode}
                    onChange={e => setDoctorJudgmentCode(e.target.value)}
                    placeholder="例: B1"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  就業判定
                  <select
                    value={employmentJudgment}
                    onChange={e => setEmploymentJudgment(e.target.value as '' | EmploymentJudgment)}
                    className={inputClass}
                  >
                    <option value="" disabled hidden />
                    {BULK_EMPLOYMENT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canSubmit || pending}
                onClick={() => {
                  if (!campaignId || !employmentJudgment) return
                  startTransition(async () => {
                    const res = await bulkApplyStandardToDoctorJudgment({
                      campaignId,
                      standardCode,
                      doctorJudgmentCode,
                      employmentJudgment,
                    })
                    if (!res.ok) {
                      setMessage(res.error ?? '失敗しました')
                      return
                    }
                    setMessage(`更新 ${res.updated ?? 0}件`)
                    router.refresh()
                    setOpen(false)
                  })
                }}
              >
                {pending ? '更新中…' : '一括判定する'}
              </Button>
            </div>
            {message && <p className="text-slate-600">{message}</p>}
          </div>
          <div className="overflow-y-auto overscroll-contain px-6 pb-4 space-y-3 text-xs text-slate-700 min-h-0">
            {matchKey ? (
              matched.length === 0 ? (
                <p className="text-slate-500">一致する未判定者はいません。</p>
              ) : (
                <>
                  <p>
                    対象 <span className="font-semibold tabular-nums">{matched.length}</span>件
                    {doctorJudgmentCode.trim() ? (
                      <>
                        {' '}
                        （{matchKey} → {doctorJudgmentCode.trim()}）
                      </>
                    ) : null}
                  </p>
                  <div className="rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="text-left py-1 px-3">氏名</th>
                          <th className="text-left py-1 px-3">標準総合判定</th>
                          <th className="text-left py-1 px-3">産業医判定（更新後）</th>
                          <th className="text-left py-1 px-3">就業判定（更新後）</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matched.map((r, i) => (
                          <tr key={`${r.employee_name}-${i}`} className="border-b border-slate-100">
                            <td className="py-1 px-3">{r.employee_name}</td>
                            <td className="py-1 px-3 font-mono">{r.overall_standard_code}</td>
                            <td className="py-1 px-3 font-mono">
                              {doctorJudgmentCode.trim() || '—'}
                            </td>
                            <td className="py-1 px-3">
                              {BULK_EMPLOYMENT_OPTIONS.find(o => o.value === employmentJudgment)
                                ?.label ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            ) : (
              <p className="text-slate-500">標準総合判定を入力すると対象者が表示されます。</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
