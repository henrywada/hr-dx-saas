'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { deleteOneOnOneSession } from '../actions'
import type { SessionRow } from '../types'

interface Props {
  sessions: SessionRow[]
  /** 編集ボタン押下時のコールバック（親で記録モーダルを編集モードで開く） */
  onEdit: (session: SessionRow) => void
}

export function SessionHistoryTable({ sessions, onEdit }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(s: SessionRow) {
    if (!confirm(`${s.employee_name} さんの「${s.theme}」の記録を削除しますか？`)) return
    setDeletingId(s.id)
    const result = await deleteOneOnOneSession(s.id)
    setDeletingId(null)
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error ?? '削除に失敗しました')
    }
  }

  if (sessions.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-400">
        記録がありません — 「記録する」ボタンから初回の1on1を登録してください
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              実施日
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              部下
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              管理職
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              テーマ
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              前回からの経過
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              次回予定
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sessions.map(s => {
            const isExpanded = expandedId === s.id
            return (
              <Fragment key={s.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {format(new Date(s.conducted_at), 'M/d (E)', { locale: ja })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{s.employee_name}</span>
                    {s.department_name && (
                      <span className="ml-1.5 text-xs text-gray-400">{s.department_name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.manager_name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-[#f6f8fa] px-2.5 py-0.5 text-xs font-medium text-[#FD7601]">
                      {s.theme}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.days_since_last === null ? (
                      <span className="text-xs text-gray-300">初回</span>
                    ) : (
                      <span className={s.days_since_last >= 30 ? 'text-orange-500 font-medium' : ''}>
                        {s.days_since_last}日
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.next_date ? (
                      format(new Date(s.next_date), 'M/d', { locale: ja })
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        {isExpanded ? '閉じる' : '詳細'}
                      </button>
                      <button
                        onClick={() => onEdit(s)}
                        className="text-xs font-medium text-[#FD7601] hover:underline"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={deletingId === s.id}
                        className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                      >
                        {deletingId === s.id ? '削除中...' : '削除'}
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-gray-50/60">
                    <td colSpan={7} className="px-4 py-3">
                      <p className="mb-1 text-xs font-semibold text-gray-500">記録内容</p>
                      {s.notes ? (
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{s.notes}</p>
                      ) : (
                        <p className="text-sm text-gray-400">（記録内容なし）</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
