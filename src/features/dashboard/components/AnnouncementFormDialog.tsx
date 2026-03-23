'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import type { AnnouncementRow } from '../types'
import { createAnnouncement, updateAnnouncement } from '../actions'
import { toJSTISOString } from '@/lib/datetime'

interface AnnouncementFormDialogProps {
  open: boolean
  onClose: () => void
  announcement?: AnnouncementRow | null
}

export function AnnouncementFormDialog({
  open,
  onClose,
  announcement,
}: AnnouncementFormDialogProps) {
  const isEdit = !!announcement
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [isNew, setIsNew] = useState(true)
  const [targetAudience, setTargetAudience] = useState('')
  const [sortOrder, setSortOrder] = useState(0)

  useEffect(() => {
    if (open) {
      setError(null)
      setTitle(announcement?.title || '')
      setBody(announcement?.body || '')
      setPublishedAt(
        announcement?.published_at
          ? new Date(announcement.published_at).toISOString().slice(0, 16)
          : toJSTISOString().slice(0, 16)
      )
      setIsNew(announcement?.is_new ?? true)
      setTargetAudience(announcement?.target_audience || '')
      setSortOrder(announcement?.sort_order ?? 0)
    }
  }, [open, announcement])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const publishedAtISO = publishedAt
          ? toJSTISOString(new Date(publishedAt))
          : toJSTISOString()

        let result
        if (isEdit && announcement) {
          result = await updateAnnouncement(announcement.id, {
            title,
            body: body || null,
            published_at: publishedAtISO,
            is_new: isNew,
            target_audience: targetAudience || null,
            sort_order: sortOrder,
          })
        } else {
          result = await createAnnouncement({
            title,
            body: body || null,
            published_at: publishedAtISO,
            is_new: isNew,
            target_audience: targetAudience || null,
            sort_order: sortOrder,
          })
        }

        if (result.success) {
          onClose()
        } else {
          setError(result.error || '保存に失敗しました。')
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '通信エラーが発生しました。')
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? 'お知らせを編集' : 'お知らせを追加'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">タイトル *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="例: 健康診断の予約について（全社員対象）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">本文</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="お知らせの詳細（任意）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">公開日時</label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={e => setPublishedAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">対象</label>
            <input
              type="text"
              value={targetAudience}
              onChange={e => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="例: 全社員対象"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_new"
              checked={isNew}
              onChange={e => setIsNew(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_new" className="text-sm font-medium text-slate-700">
              NEW バッジを表示する
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">表示順</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value) || 0)}
              min={0}
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? '保存中...' : isEdit ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
