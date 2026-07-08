'use client'

import React, { useState } from 'react'
import TenantBackLink from '@/components/common/TenantBackLink'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'
import { PeriodFormDialog } from './PeriodFormDialog'
import { PeriodTargetsModal } from './PeriodTargetsModal'
import { deleteStressCheckPeriod } from '../actions'
import type { StressCheckPeriodWithDivisions } from '@/features/stress-check/types'
import type { Division } from '@/features/organization/types'
import { buildDivisionFullPath } from '@/features/organization/types'

interface MntSetsUIProps {
  tenantId: string
  periods: StressCheckPeriodWithDivisions[]
  allDivisions: Division[]
}

export function MntSetsUI({ tenantId, periods, allDivisions }: MntSetsUIProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<StressCheckPeriodWithDivisions | null>(null)
  const [targetsPeriod, setTargetsPeriod] = useState<StressCheckPeriodWithDivisions | null>(null)

  const handleCreate = () => {
    setEditingPeriod(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (p: StressCheckPeriodWithDivisions) => {
    setEditingPeriod(p)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string, title: string) => {
    if (
      confirm(`本当に「${title}」を削除しますか？\n※関連する回答データがある場合は削除できません。`)
    ) {
      const res = await deleteStressCheckPeriod(id)
      if (!res.success) {
        alert(`削除に失敗しました: ${res.error}`)
      }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            実施中
          </span>
        )
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f6f8fa] text-[#24292f]">
            終了
          </span>
        )
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            準備中
          </span>
        )
    }
  }

  const getDivisionSummary = (divisionIds: string[]): string => {
    if (divisionIds.length === 0) return '—'
    const names = divisionIds.slice(0, 3).map(id => {
      const div = allDivisions.find(d => d.id === id)
      return div?.name ?? '不明'
    })
    const suffix = divisionIds.length > 3 ? ` 他${divisionIds.length - 3}件` : ''
    return names.join('、') + suffix
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#24292f] border-b-2 border-green-500 pb-2 inline-block">
            実施グループの管理
          </h1>
          <p className="text-sm text-[#57606a] mt-2">
            対象部署を指定してストレスチェックの実施グループを設定します。
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <TenantBackLink className="self-start shrink-0" />
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg shadow-sm hover:from-teal-600 hover:to-emerald-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span className="font-semibold text-sm">新規作成</span>
          </button>
        </div>
      </div>

      <div className="bg-white border text-sm border-[#e2e6ec] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f6f8fa] border-b border-[#e2e6ec] text-[#57606a]">
                <th className="px-6 py-4 font-semibold">タイトル</th>
                <th className="px-6 py-4 font-semibold">対象部署</th>
                <th className="px-6 py-4 font-semibold text-center">対象年度</th>
                <th className="px-6 py-4 font-semibold text-center">質問数</th>
                <th className="px-6 py-4 font-semibold text-center">ステータス</th>
                <th className="px-6 py-4 font-semibold">期間</th>
                <th className="px-6 py-4 font-semibold text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e6ec]">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[#57606a]">
                    登録されている実施グループはありません。
                  </td>
                </tr>
              ) : (
                periods.map(period => (
                  <tr key={period.id} className="hover:bg-[#f6f8fa] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#24292f]">
                      {period.title}
                      {period.comment && (
                        <p className="text-xs text-[#57606a] font-normal mt-0.5 truncate max-w-50">
                          {period.comment}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#57606a] max-w-55">
                      <span
                        className="truncate block"
                        title={period.divisionIds
                          .map(id => buildDivisionFullPath(id, allDivisions))
                          .join('\n')}
                      >
                        {getDivisionSummary(period.divisionIds)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-[#57606a]">
                      {period.fiscal_year}年度
                    </td>
                    <td className="px-6 py-4 text-center text-[#57606a]">
                      {period.questionnaire_type}問
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusLabel(period.status)}</td>
                    <td className="px-6 py-4 text-[#57606a] whitespace-nowrap">
                      {period.start_date.split('T')[0]} ～ {period.end_date.split('T')[0]}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setTargetsPeriod(period)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="対象者管理"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(period)}
                          className="p-1.5 text-[#FD7601] hover:bg-[#f6f8fa] rounded transition-colors"
                          title="編集"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(period.id, period.title)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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

      <PeriodFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        period={editingPeriod}
        tenantId={tenantId}
        allDivisions={allDivisions}
      />

      {targetsPeriod && (
        <PeriodTargetsModal
          period={targetsPeriod}
          allDivisions={allDivisions}
          onClose={() => setTargetsPeriod(null)}
        />
      )}
    </div>
  )
}
