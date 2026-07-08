'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Bell } from 'lucide-react'
import type { AnnouncementRow } from '../types'
import { deleteAnnouncement } from '../actions'
import { AnnouncementFormDialog } from './AnnouncementFormDialog'
import { formatDateInJST } from '@/lib/datetime'
import TenantBackLink from '@/components/common/TenantBackLink'

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
          <h1 className="text-2xl font-bold text-[#24292f] tracking-tight">お知らせ管理</h1>
          <p className="text-sm text-[#57606a] mt-1">
            人事からのお知らせを登録・編集します。公開後は従業員トップ画面の「お知らせ」カードに、公開日・対象・NEW
            バッジ付きで表示されます。
          </p>
        </div>
        <div className="flex gap-2">
          <TenantBackLink />
          <button
            onClick={() => setDialogState({ open: true })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#FD7601] rounded-lg hover:bg-[#FD7601] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            お知らせを追加
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e2e6ec] bg-[#f6f8fa]/50 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#FD7601]" />
          <span className="text-sm font-medium text-[#57606a]">
            お知らせ一覧
            <span className="text-xs text-[#57606a] ml-2">
              ({announcements.length}件・トップ画面に連動)
            </span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e6ec] bg-[#f6f8fa]/30">
                <th className="text-left px-4 py-3 font-semibold text-[#57606a] text-xs uppercase tracking-wider">
                  公開日
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[#57606a] text-xs uppercase tracking-wider">
                  タイトル
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[#57606a] text-xs uppercase tracking-wider hidden md:table-cell">
                  対象
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[#57606a] text-xs uppercase tracking-wider">
                  NEW
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[#57606a] text-xs uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {announcements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 px-4">
                    <Bell className="w-10 h-10 mx-auto mb-3 text-[#57606a] opacity-30" />
                    <p className="text-sm font-medium text-[#24292f]">お知らせはまだありません</p>
                    <p className="text-xs text-[#57606a] mt-1 max-w-sm mx-auto">
                      「お知らせを追加」から登録すると、従業員トップの「お知らせ」カードに公開日・タイトル・対象が表示されます。
                    </p>
                  </td>
                </tr>
              ) : (
                announcements.map(a => (
                  <tr
                    key={a.id}
                    className="border-b border-[#e2e6ec] hover:bg-[#f6f8fa]/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#57606a]">
                      {formatDate(a.published_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#24292f]">{a.title}</td>
                    <td className="px-4 py-3 text-[#57606a] hidden md:table-cell">
                      {a.target_audience || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.is_new ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          NEW
                        </span>
                      ) : (
                        <span className="text-[#57606a] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setDialogState({ open: true, announcement: a })}
                          className="p-1.5 rounded-lg text-[#57606a] hover:text-[#FD7601] hover:bg-[#f6f8fa] transition-colors"
                          title="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1.5 rounded-lg text-[#57606a] hover:text-red-600 hover:bg-red-50 transition-colors"
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-[#e2e6ec]">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-[#24292f]">お知らせを削除</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-bold">「{deleteTarget.title}」</span>を削除しますか？
                </p>
                <p className="text-xs text-red-600 mt-1">この操作は取り消せません。</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-[#57606a] bg-white border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa] transition-colors"
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
