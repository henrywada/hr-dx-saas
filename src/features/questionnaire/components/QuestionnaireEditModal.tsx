'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useState, useTransition } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { updateQuestionnaire } from '../actions'
import type { QuestionnaireListItem } from '../types'

interface Props {
  questionnaire: QuestionnaireListItem
  onUpdated: (updated: Partial<QuestionnaireListItem>) => void
  onClose: () => void
}

export default function QuestionnaireEditModal({ questionnaire, onUpdated, onClose }: Props) {
  const [open, setOpen] = useState(true)
  const [title, setTitle] = useState(questionnaire.title)
  const [description, setDescription] = useState(questionnaire.description ?? '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setOpen(false)
    onClose()
  }

  function handleSave() {
    if (!title.trim()) {
      setError('タイトルを入力してください。')
      return
    }
    setError('')
    startTransition(async () => {
      const res = await updateQuestionnaire(questionnaire.id, {
        title: title.trim(),
        description: description.trim() || undefined,
      })
      if (res.success) {
        onUpdated({ title: title.trim(), description: description.trim() || null })
        handleClose()
      } else {
        setError(res.error ?? '更新に失敗しました。')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[80vh] max-w-lg flex flex-col gap-0 overflow-hidden rounded-lg border-0 bg-white p-0 shadow-lg">
        <DialogHeader className="border-b border-neutral-200 px-6 py-4">
          <DialogTitle className="text-lg font-bold text-neutral-800">アンケートを編集</DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            アンケートのタイトルと説明文を編集します
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-4 [scrollbar-gutter:stable]">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* 説明文 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">冒頭説明文</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={8}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* ステータスに関する注記 */}
          {questionnaire.status !== 'draft' && (
            <p className="text-xs text-neutral-400 bg-neutral-50 rounded-lg px-3 py-2">
              ※ 受付中・終了済みのアンケートはタイトルと説明文のみ変更できます。
              設問を変更したい場合は一度「終了」→「削除」して再作成してください。
            </p>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <Button variant="outline" size="md" onClick={handleClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button variant="primary" size="md" onClick={handleSave} disabled={isPending}>
            {isPending ? '保存中...' : '保存する'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
