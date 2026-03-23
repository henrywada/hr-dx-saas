'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ProgramInstanceRow } from '../types'
import { PROGRAM_TYPE_LABELS } from '../constants'
import { APP_ROUTES } from '@/config/routes'

interface ProgramInstanceTableProps {
  instances: ProgramInstanceRow[]
}

export function ProgramInstanceTable({ instances }: ProgramInstanceTableProps) {
  const basePath = APP_ROUTES.TENANT.ADMIN_PROGRAM_TARGETS

  const stressCheckInstances = instances.filter((i) => i.programType === 'stress_check')
  const pulseSurveyInstances = instances.filter((i) => i.programType === 'pulse_survey')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">実施対象者管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          ストレスチェック・パルスサーベイ等の実施枠ごとに対象者を管理します
        </p>
      </div>

      {/* ストレスチェック */}
      {stressCheckInstances.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-sm font-medium text-slate-600">
              {PROGRAM_TYPE_LABELS.stress_check}
              <span className="text-xs text-slate-400 ml-2">
                ({stressCheckInstances.length}件)
              </span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    実施枠
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    期間
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    対象者数
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {stressCheckInstances.map((inst) => (
                  <tr
                    key={`${inst.programType}-${inst.instanceId}`}
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{inst.label}</td>
                    <td className="px-4 py-3 text-slate-600">{inst.subLabel ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {inst.targetCount ?? 0}名
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`${basePath}/stress_check/${inst.instanceId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        対象者を管理
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* パルスサーベイ */}
      {pulseSurveyInstances.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-sm font-medium text-slate-600">
              {PROGRAM_TYPE_LABELS.pulse_survey}
              <span className="text-xs text-slate-400 ml-2">
                ({pulseSurveyInstances.length}件)
              </span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    実施枠
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    期限
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    対象者数
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {pulseSurveyInstances.map((inst) => (
                  <tr
                    key={`${inst.programType}-${inst.instanceId}`}
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{inst.label}</td>
                    <td className="px-4 py-3 text-slate-600">{inst.subLabel ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {inst.targetCount ?? 0}名
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`${basePath}/pulse_survey/${inst.instanceId}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        対象者を管理
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {instances.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
          実施枠がありません。ストレスチェック期間またはパルスサーベイ期間を先に作成してください。
        </div>
      )}
    </div>
  )
}
