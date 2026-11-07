'use client'

import React, { useState } from 'react'
import { FileText } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { listPublishedDocumentsAction, type PublishedDocumentRow } from '../list-action'

const DATE_FORMAT = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 質問の対象になっている登録資料をモーダルで一覧表示する */
export function DocumentListModal() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<PublishedDocumentRow[]>([])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await listPublishedDocumentsAction()
      if (res.ok === false) setError(res.error)
      else setDocuments(res.documents)
    } catch {
      setError('資料一覧の取得に失敗しました。時間をおいてもう一度お試しください')
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) void load()
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => handleOpenChange(true)}>
        <FileText className="h-4 w-4" aria-hidden />
        登録資料リスト
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[80vh] max-w-[720px] rounded-lg">
          <DialogHeader className="rounded-t-lg px-5 pb-3 pt-5 sm:px-5 sm:pb-3 sm:pt-5">
            <DialogTitle>登録資料リスト</DialogTitle>
            <p className="text-xs text-slate-500">
              質問の対象になっている資料です（{documents.length}件）
            </p>
          </DialogHeader>

          <div className="overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="py-6 text-center text-sm text-slate-500">読み込み中…</p>
            ) : error ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : documents.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                登録されている資料はまだありません
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-1.5 pr-3 font-medium">資料</th>
                    <th className="py-1.5 pr-3 font-medium">カテゴリ</th>
                    <th className="py-1.5 font-medium">更新日</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(d => (
                    <tr key={d.id} className="border-b border-slate-100 align-top">
                      <td className="py-1.5 pr-3">
                        <p className="font-medium text-slate-900">{d.title}</p>
                        {d.filename ? (
                          <p className="text-xs text-slate-500">{d.filename}</p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap py-1.5 pr-3 text-slate-700">{d.category}</td>
                      <td className="whitespace-nowrap py-1.5 text-slate-700">
                        {DATE_FORMAT.format(new Date(d.updatedAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
