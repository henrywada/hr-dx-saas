'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { saveEmploymentJudgment, saveNurseComment } from '@/features/health-check/actions'
import type { EmployeeResultView, EmploymentJudgment } from '@/features/health-check/types'

export function DoctorReviewForm({ view, role }: { view: EmployeeResultView; role: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const isDoctor = role === 'company_doctor'
  const r = view.record
  const suggestDoctor = (view.overallStandardCode ?? '').startsWith('C')

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
      <p className="text-xs font-semibold text-slate-900">就業判定</p>
      {message && <p className="text-xs text-slate-600">{message}</p>}
      {isDoctor ? (
        <form
          className="space-y-3"
          onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              const res = await saveEmploymentJudgment({
                recordId: r.id,
                employmentJudgment: String(fd.get('employment_judgment')) as EmploymentJudgment,
                nurseInterviewRecommended: fd.get('nurse') === 'on',
                doctorInterviewRecommended: fd.get('doctor') === 'on',
                doctorComment: String(fd.get('doctor_comment') || '') || null,
                doctorJudgmentCode: String(fd.get('doctor_judgment_code') || '') || null,
              })
              setMessage(res.ok ? '保存しました' : (res.error ?? '失敗'))
              router.refresh()
            })
          }}
        >
          <label className="text-xs block">
            判定
            <select
              name="employment_judgment"
              defaultValue={r.employment_judgment}
              className="mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            >
              <option value="pending">未判定</option>
              <option value="hold">保留</option>
              <option value="fit">通常勤務</option>
              <option value="restricted">就業制限</option>
              <option value="leave">要休業</option>
            </select>
          </label>
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" name="nurse" defaultChecked={r.nurse_interview_recommended} />
            保健師面談推奨
          </label>
          <label className="text-xs flex items-center gap-2">
            <input type="checkbox" name="doctor" defaultChecked={r.doctor_interview_recommended} />
            産業医面談推奨
            {suggestDoctor && !r.doctor_interview_recommended && (
              <span className="text-[10px] text-amber-700">（標準判定がC系のため提案）</span>
            )}
          </label>
          <label className="text-xs block">
            産業医判定コード
            <input
              name="doctor_judgment_code"
              defaultValue={view.notes?.doctor_judgment_code ?? ''}
              className="mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </label>
          <label className="text-xs block">
            産業医コメント
            <textarea
              name="doctor_comment"
              defaultValue={view.notes?.doctor_comment ?? ''}
              rows={4}
              className="mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            就業判定を保存
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            startTransition(async () => {
              const res = await saveNurseComment({
                recordId: r.id,
                nurseComment: String(fd.get('nurse_comment') || ''),
              })
              setMessage(res.ok ? 'コメントを保存しました' : (res.error ?? '失敗'))
              router.refresh()
            })
          }}
        >
          <label className="text-xs block">
            保健師コメント
            <textarea
              name="nurse_comment"
              defaultValue={view.notes?.nurse_comment ?? ''}
              rows={3}
              className="mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            コメントを保存
          </Button>
        </form>
      )}
    </div>
  )
}
