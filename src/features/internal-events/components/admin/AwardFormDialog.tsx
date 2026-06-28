'use client'

import { useState, useTransition } from 'react'
import { createAward } from '../../actions'

interface EmployeeOption {
  id: string
  name: string
}

interface Props {
  employees: EmployeeOption[]
}

export function AwardFormDialog({ employees }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [recipientEmployeeId, setRecipientEmployeeId] = useState('')
  const [awardType, setAwardType] = useState('')
  const [periodLabel, setPeriodLabel] = useState('')
  const [comment, setComment] = useState('')
  const [publishAnnouncement, setPublishAnnouncement] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resetForm = () => {
    setRecipientEmployeeId('')
    setAwardType('')
    setPeriodLabel('')
    setComment('')
    setPublishAnnouncement(true)
    setErrorMessage(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    startTransition(async () => {
      try {
        await createAward({
          recipientEmployeeId,
          awardType,
          periodLabel,
          comment: comment || undefined,
          publishAnnouncement,
        })
        resetForm()
        setIsOpen(false)
      } catch {
        setErrorMessage('表彰の登録に失敗しました。')
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FD7601] text-white hover:opacity-90 transition-opacity"
      >
        表彰を登録
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md space-y-3">
        <h2 className="text-sm font-bold text-slate-900">表彰登録</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">受賞者</label>
            <select
              required
              value={recipientEmployeeId}
              onChange={e => setRecipientEmployeeId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            >
              <option value="">選択してください</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">表彰名</label>
            <input
              type="text"
              required
              placeholder="例: 月間MVP"
              value={awardType}
              onChange={e => setAwardType(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">対象期間</label>
            <input
              type="text"
              required
              placeholder="例: 2026-06"
              value={periodLabel}
              onChange={e => setPeriodLabel(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">コメント</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={publishAnnouncement}
              onChange={e => setPublishAnnouncement(e.target.checked)}
            />
            お知らせに掲載する
          </label>
          {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsOpen(false)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FD7601] text-white disabled:opacity-50"
            >
              登録する
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
