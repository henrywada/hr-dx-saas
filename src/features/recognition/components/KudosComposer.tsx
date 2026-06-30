'use client'

import { useState, useTransition } from 'react'
import { createKudos } from '../actions'
import { VALUE_TAGS } from '../labels'

interface EmployeeOption {
  id: string
  name: string
}

interface Props {
  employees: EmployeeOption[]
  /** DB マスタのタグ。空の場合は labels.ts のデフォルトにフォールバック */
  valueTags?: string[]
}

export function KudosComposer({ employees, valueTags }: Props) {
  const tagOptions = valueTags && valueTags.length > 0 ? valueTags : [...VALUE_TAGS]
  const [recipientEmployeeIds, setRecipientEmployeeIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [valueTag, setValueTag] = useState('')
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    startTransition(async () => {
      try {
        await createKudos({
          recipientEmployeeIds,
          message,
          valueTag: valueTag || undefined,
        })
        setRecipientEmployeeIds([])
        setMessage('')
        setValueTag('')
      } catch {
        setErrorMessage('投稿に失敗しました。もう一度お試しください。')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3"
    >
      <h2 className="text-sm font-bold text-slate-900">感謝・称賛を送る</h2>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700">宛先（複数選択可）</label>
        <select
          multiple
          required
          size={Math.min(6, Math.max(3, employees.length))}
          value={recipientEmployeeIds}
          onChange={e =>
            setRecipientEmployeeIds(Array.from(e.target.selectedOptions, o => o.value))
          }
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        >
          {employees.map(employee => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700">バリュータグ（任意）</label>
        <select
          value={valueTag}
          onChange={e => setValueTag(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        >
          <option value="">選択しない</option>
          {tagOptions.map(tag => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700">メッセージ</label>
        <textarea
          required
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="いつもありがとうございます！"
          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        />
      </div>
      {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || recipientEmployeeIds.length === 0}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FD7601] text-white disabled:opacity-50"
        >
          送信する
        </button>
      </div>
    </form>
  )
}
