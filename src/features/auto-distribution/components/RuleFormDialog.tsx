'use client'

import React, { useState, useTransition } from 'react'
import { X, Plus } from 'lucide-react'
import type { AutoDistributionRule, ScheduleType } from '../types'
import { DAY_OF_WEEK_LABELS } from '../types'
import { createAutoDistributionRule, updateAutoDistributionRule } from '../actions'

interface RuleFormDialogProps {
  open: boolean
  onClose: () => void
  rule?: AutoDistributionRule | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RuleFormDialog({ open, onClose, rule }: RuleFormDialogProps) {
  const isEdit = !!rule
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [searchTheme, setSearchTheme] = useState('')
  const [targetUrlsText, setTargetUrlsText] = useState('')
  const [recipientEmails, setRecipientEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [maxArticles, setMaxArticles] = useState(5)
  const [scheduleType, setScheduleType] = useState<ScheduleType>('weekly')
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1)
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState(1)
  const [isActive, setIsActive] = useState(true)

  React.useEffect(() => {
    if (open) {
      setError(null)
      setName(rule?.name ?? '')
      setSearchTheme(rule?.search_theme ?? '')
      setTargetUrlsText((rule?.target_urls ?? []).join('\n'))
      setRecipientEmails(rule?.recipient_emails ?? [])
      setEmailInput('')
      setMaxArticles(rule?.max_articles ?? 5)
      setScheduleType(rule?.schedule_type ?? 'weekly')
      setScheduleDayOfWeek(rule?.schedule_day_of_week ?? 1)
      setScheduleDayOfMonth(rule?.schedule_day_of_month ?? 1)
      setIsActive(rule?.is_active ?? true)
    }
  }, [open, rule])

  if (!open) return null

  const addEmail = () => {
    const value = emailInput.trim()
    if (!value) return
    if (!EMAIL_PATTERN.test(value)) {
      setError('メールアドレスの形式が正しくありません。')
      return
    }
    if (recipientEmails.includes(value)) {
      setEmailInput('')
      return
    }
    setRecipientEmails(prev => [...prev, value])
    setEmailInput('')
    setError(null)
  }

  const removeEmail = (target: string) => {
    setRecipientEmails(prev => prev.filter(e => e !== target))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (recipientEmails.length === 0) {
      setError('配信先メールアドレスを1件以上追加してください。')
      return
    }

    const targetUrls = targetUrlsText
      .split('\n')
      .map(url => url.trim())
      .filter(Boolean)

    const data = {
      name,
      search_theme: searchTheme,
      target_urls: targetUrls.length > 0 ? targetUrls : null,
      recipient_emails: recipientEmails,
      max_articles: maxArticles,
      schedule_type: scheduleType,
      schedule_day_of_week: scheduleType === 'weekly' ? scheduleDayOfWeek : null,
      schedule_day_of_month: scheduleType === 'monthly' ? scheduleDayOfMonth : null,
      is_active: isActive,
    }

    startTransition(async () => {
      const result =
        isEdit && rule
          ? await updateAutoDistributionRule(rule.id, data)
          : await createAutoDistributionRule(data)

      if (result.success) {
        onClose()
      } else {
        setError(result.error || '保存に失敗しました。')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-[#e2e6ec] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e6ec] bg-[#f6f8fa] sticky top-0">
          <h3 className="text-lg font-bold text-[#24292f]">
            {isEdit ? '自動配信ルールを編集' : '自動配信ルールを追加'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white text-[#57606a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              ルール名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none"
              placeholder="例：週次 人事DXニュース"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              検索テーマ・条件 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={searchTheme}
              onChange={e => setSearchTheme(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none"
              placeholder={
                '検索するテーマ、条件をご記入ください（複数行可）\n例：人事DX 最新動向\n働き方改革 法改正'
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              主に探すURL（任意・1行1件）
            </label>
            <textarea
              value={targetUrlsText}
              onChange={e => setTargetUrlsText(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              配信先メールアドレス <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {recipientEmails.map(mail => (
                <span
                  key={mail}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f6f8fa] border border-[#e2e6ec] rounded-full text-xs text-[#24292f]"
                >
                  {mail}
                  <button
                    type="button"
                    onClick={() => removeEmail(mail)}
                    className="text-[#57606a] hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addEmail()
                  }
                }}
                className="flex-1 px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none"
                placeholder="hr-admin@example.com"
              />
              <button
                type="button"
                onClick={addEmail}
                className="px-3 py-2 text-sm font-medium text-[#24292f] bg-[#f6f8fa] border border-[#e2e6ec] rounded-lg hover:bg-white transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                追加
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#24292f] mb-1">配信周期</label>
              <select
                value={scheduleType}
                onChange={e => setScheduleType(e.target.value as ScheduleType)}
                className="w-full px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none bg-white"
              >
                <option value="weekly">毎週</option>
                <option value="monthly">毎月</option>
              </select>
            </div>
            <div>
              {scheduleType === 'weekly' ? (
                <>
                  <label className="block text-sm font-medium text-[#24292f] mb-1">曜日</label>
                  <select
                    value={scheduleDayOfWeek}
                    onChange={e => setScheduleDayOfWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none bg-white"
                  >
                    {DAY_OF_WEEK_LABELS.map((label, i) => (
                      <option key={i} value={i}>
                        {label}曜日
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-[#24292f] mb-1">日付</label>
                  <select
                    value={scheduleDayOfMonth}
                    onChange={e => setScheduleDayOfMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none bg-white"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d} value={d}>
                        {d}日
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-[#57606a]">配信時刻は毎回 4:00（JST）固定です。</p>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              出力する記事の最大件数
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxArticles}
              onChange={e => setMaxArticles(Number(e.target.value))}
              className="w-32 px-3 py-2 border border-[#e2e6ec] rounded-lg text-sm focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-[#e2e6ec] text-[#FD7601] focus:ring-[#FD7601]"
            />
            <label htmlFor="isActive" className="text-sm text-[#24292f]">
              このルールを有効にする
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#e2e6ec]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#57606a] bg-white border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa] transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !searchTheme.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#FD7601] rounded-lg hover:bg-[#FD7601] disabled:opacity-50 transition-colors"
            >
              {isPending ? '保存中...' : 'ルールを保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
