'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { deleteSkillMapDraft, saveSkillMapDraft } from '../draft-actions'
import type { SkillMapDraftRow } from '../draft-queries'
import type { EmployeeCompletionRow } from '../types'

interface Props {
  drafts: SkillMapDraftRow[]
  completionRows: EmployeeCompletionRow[]
}

export function SkillMapDraftPanel({ drafts, completionRows }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [draftName, setDraftName] = useState('')

  const withSkills = completionRows.filter(r => r.totalRequirements > 0)
  const avgRate =
    withSkills.length > 0
      ? Math.round(withSkills.reduce((s, r) => s + (r.completionRate ?? 0), 0) / withSkills.length)
      : null

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!draftName.trim()) return
    startTransition(async () => {
      await saveSkillMapDraft({
        name: draftName.trim(),
        snapshot: {
          savedAt: new Date().toISOString(),
          employeeCount: completionRows.length,
          avgCompletionRate: avgRate,
          summary: withSkills.slice(0, 20).map(r => ({
            employeeId: r.employee_id,
            employeeName: r.full_name ?? r.employee_id,
            completionRate: r.completionRate,
          })),
        },
      })
      setDraftName('')
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('このドラフトを削除しますか？')) return
    startTransition(async () => {
      await deleteSkillMapDraft(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSave} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-600 mb-1">分析スナップショットを保存</label>
          <input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            placeholder="例: 2026Q2 スキル充足状況"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
          />
        </div>
        <button type="submit" disabled={isPending} className="px-3 py-1.5 text-xs rounded-lg bg-[#FD7601] text-white disabled:opacity-50">
          ドラフト保存
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left">名称</th>
              <th className="px-4 py-2 text-left">作成日</th>
              <th className="px-4 py-2 text-right">平均充足率</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drafts.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">保存されたドラフトはありません</td></tr>
            ) : (
              drafts.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{d.name}</td>
                  <td className="px-4 py-2 text-gray-600">{format(new Date(d.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{d.avg_completion_rate != null ? `${d.avg_completion_rate}%` : '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => handleDelete(d.id)} disabled={isPending} className="text-red-600 hover:underline">削除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
