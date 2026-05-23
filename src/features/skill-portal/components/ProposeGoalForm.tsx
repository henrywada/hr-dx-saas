'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { proposeCareerGoal } from '../actions'
import { APP_ROUTES } from '@/config/routes'

interface TenantSkill {
  id: string
  name: string
}
interface MilestoneRow {
  title: string
  targetDate: string
}

interface ProposeGoalFormProps {
  employeeId: string
  employeeName: string | null
  tenantSkills: TenantSkill[]
}

export function ProposeGoalForm({ employeeId, employeeName, tenantSkills }: ProposeGoalFormProps) {
  const router = useRouter()
  const [skillId, setSkillId] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [message, setMessage] = useState('')
  const [milestones, setMilestones] = useState<MilestoneRow[]>([{ title: '', targetDate: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addMilestone() {
    setMilestones(prev => [...prev, { title: '', targetDate: '' }])
  }

  function removeMilestone(idx: number) {
    setMilestones(prev => prev.filter((_, i) => i !== idx))
  }

  function updateMilestone(idx: number, field: keyof MilestoneRow, value: string) {
    setMilestones(prev => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!skillId || !targetDate) {
      setError('職種と期限は必須です')
      return
    }
    const validMilestones = milestones.filter(m => m.title.trim())
    setSubmitting(true)
    setError(null)
    const result = await proposeCareerGoal({
      employeeId,
      skillId,
      targetDate,
      message: message.trim() || undefined,
      milestones: validMilestones.map((m, i) => ({
        title: m.title.trim(),
        targetDate: m.targetDate || null,
        sortOrder: i + 1,
      })),
    })
    setSubmitting(false)
    if (result.success) router.push(APP_ROUTES.TENANT.SKILL_JOURNEY(employeeId))
    else setError((result as { success: false; error: string }).error)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl mx-auto bg-white rounded-xl border p-6 space-y-5"
    >
      <h2 className="text-base font-bold text-gray-800">{employeeName ?? ''}さんへの目標提案</h2>
      {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">目標職種 *</label>
        <select
          value={skillId}
          onChange={e => setSkillId(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="">選択してください</option>
          {tenantSkills.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">達成期限 *</label>
        <input
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          required
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-600">マイルストーン</label>
          <button
            type="button"
            onClick={addMilestone}
            className="text-xs text-primary hover:underline"
          >
            ＋ 追加
          </button>
        </div>
        {milestones.map((m, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              value={m.title}
              onChange={e => updateMilestone(idx, 'title', e.target.value)}
              placeholder={`STEP${idx + 1} タイトル`}
              className="flex-1 border rounded px-3 py-1.5 text-sm"
            />
            <input
              type="date"
              value={m.targetDate}
              onChange={e => updateMilestone(idx, 'targetDate', e.target.value)}
              className="w-36 border rounded px-2 py-1.5 text-sm"
            />
            {milestones.length > 1 && (
              <button
                type="button"
                onClick={() => removeMilestone(idx)}
                className="text-gray-400 hover:text-red-500 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          メンバーへのメッセージ（任意）
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="目標提案に添えるメッセージ..."
          className="w-full border rounded px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 border rounded px-4 py-2 hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="text-sm bg-primary text-white rounded px-5 py-2 hover:bg-blue-600 disabled:opacity-50"
        >
          {submitting ? '送信中...' : '提案を送る'}
        </button>
      </div>
    </form>
  )
}
