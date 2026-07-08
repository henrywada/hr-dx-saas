'use client'

import React, { useState } from 'react'
import { Plus, Pencil, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ServiceAssignmentRow } from '../types'
import { ServiceAssignmentFormDialog } from './ServiceAssignmentFormDialog'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'

interface ServiceAssignmentTableProps {
  assignments: ServiceAssignmentRow[]
}

export function ServiceAssignmentTable({ assignments }: ServiceAssignmentTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const basePath = `${APP_ROUTES.TENANT.ADMIN}/service-assignments`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#24292f] tracking-tight">サービス対象者管理</h1>
          <p className="text-sm text-[#57606a] mt-1">
            サービスの対象ユーザーを一覧・編集・同期できます
          </p>
        </div>
        <div className="flex gap-2">
          <TenantBackLink />
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#FD7601] rounded-lg hover:bg-[#FD7601] shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-[#e2e6ec] bg-[#f6f8fa]/50 flex items-center gap-2">
          <span className="text-sm font-medium text-[#57606a]">
            サービス割当一覧
            <span className="text-xs text-[#57606a] ml-2">({assignments.length}件)</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e2e6ec] bg-[#f6f8fa]/30">
                <th className="text-left px-4 py-3 font-semibold text-[#57606a] text-xs uppercase tracking-wider">
                  サービス種別
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[#57606a] text-xs uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-12 text-[#57606a]">
                    サービス割当がありません。新規作成してください。
                  </td>
                </tr>
              ) : (
                assignments.map(a => (
                  <tr
                    key={a.id}
                    className="border-b border-[#e2e6ec] hover:bg-[#f6f8fa]/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-[#24292f]">
                      {a.service_type}
                      <span className="ml-1 text-[#57606a] font-normal text-xs">
                        （{a.user_count}名）
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`${basePath}/${a.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[#57606a] hover:text-[#FD7601] hover:bg-[#f6f8fa] transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          詳細・編集
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ServiceAssignmentFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
