'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Bell } from 'lucide-react'
import type { AnnouncementRow } from '../types'
import { deleteAnnouncement } from '../actions'
import { AnnouncementFormDialog } from './AnnouncementFormDialog'
import { formatDateInJST } from '@/lib/datetime'

interface AnnouncementTableProps {
  announcements: AnnouncementRow[]
}

export function AnnouncementTable({ announcements }: AnnouncementTableProps) {
  const [isPending, startTransition] = useTransition()
  const [dialogState, setDialogState] = useState<{
    open: boolean
    announcement?: AnnouncementRow
  }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRow | null>(null)

  const handleDelete = (a: AnnouncementRow) => setDeleteTarget(a)

  const confirmDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteAnnouncement(deleteTarget.id)
      setDeleteTarget(null)
    })
  }

  const formatDate = (iso: string) => formatDateInJST(iso).replace(/\//g, '.')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">お知らせ管理</h1>
          <p className="text-sm text-slate-500 mt-1">人事からのお知らせを一覧・追加・編集できます</p>
        </div>
        <button
          onClick={() => setDialogState({ open: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          お知らせを追加
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-slate-600">
            お知らせ一覧
            <span className="text-xs text-slate-400 ml-2">({announcements.length}件)</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  公開日
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  タイトル
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">
                  対象
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  NEW
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    お知らせがありません
                  </td>
                </tr>
              ) : (
                announcements.map(a => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {formatDate(a.published_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{a.title}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                      {a.target_audience || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.is_new ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          NEW
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setDialogState({ open: true, announcement: a })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnnouncementFormDialog
        open={dialogState.open}
        onClose={() => setDialogState({ open: false })}
        announcement={dialogState.announcement}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">お知らせを削除</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-bold">「{deleteTarget.title}」</span>を削除しますか？
                </p>
                <p className="text-xs text-red-600 mt-1">この操作は取り消せません。</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
