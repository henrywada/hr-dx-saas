'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { sendHrInquiryMail } from '@/features/dashboard/actions'

export function HrInquiryMailForm() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    const fd = new FormData()
    fd.set('subject', subject)
    fd.set('body', body)
    const res = await sendHrInquiryMail(fd)
    setLoading(false)
    if (res.ok === false) {
      setError(res.error)
      return
    }
    setSuccess(true)
    setSubject('')
    setBody('')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        AI の回答で解決しない場合、人事担当へメールでお問い合わせいただけます。返信は人事の業務状況により数日かかる場合があります。
      </p>

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          送信しました。人事担当より返信がある場合があります。
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label htmlFor="hr-inquiry-subject" className="block text-sm font-medium text-slate-700 mb-1">
            件名
          </label>
          <input
            id="hr-inquiry-subject"
            name="subject"
            type="text"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例：育休からの復職手続きについて"
          />
        </div>
        <div>
          <label htmlFor="hr-inquiry-body" className="block text-sm font-medium text-slate-700 mb-1">
            本文
          </label>
          <textarea
            id="hr-inquiry-body"
            name="body"
            required
            maxLength={8000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={loading}
            rows={8}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[140px]"
            placeholder="ご質問・ご依頼の内容を具体的にご記入ください。"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="primary" disabled={loading || !subject.trim() || !body.trim()}>
          {loading ? '送信中…' : '人事へ送信'}
        </Button>
      </form>
    </div>
  )
}
