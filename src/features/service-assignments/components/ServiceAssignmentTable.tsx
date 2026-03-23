'use client'

import React, { useState } from 'react'
import { Plus, Pencil, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ServiceAssignmentRow } from '../types'
import { ServiceAssignmentFormDialog } from './ServiceAssignmentFormDialog'
import { APP_ROUTES } from '@/config/routes'

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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            サービス対象者管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            サービスの対象ユーザーを一覧・編集・同期できます
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規作成
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">
            サービス割当一覧
            <span className="text-xs text-slate-400 ml-2">({assignments.length}件)</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  サービス種別
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-12 text-slate-400">
                    サービス割当がありません。新規作成してください。
                  </td>
                </tr>
              ) : (
                assignments.map(a => (
                  <tr
                    key={a.id}
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{a.service_type}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`${basePath}/${a.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
