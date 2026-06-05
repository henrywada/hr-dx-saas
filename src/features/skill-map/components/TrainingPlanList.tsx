'use client'

// TrainingPlanView から import される。育成計画一覧サブタブ。

import { useState } from 'react'
import { TrainingCreatePlanModal } from './TrainingCreatePlanModal'
import type { TrainingEmployeePlanRow, TrainingPlanTemplateRow } from '../training-plan-types'

interface Props {
  plans: TrainingEmployeePlanRow[]
  templates: TrainingPlanTemplateRow[]
  employees: { id: string; name: string; department_name: string | null }[]
}

export function TrainingPlanList({ plans, templates, employees }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{plans.length} 件の育成計画</p>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          ＋ 育成計画を作成
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-sm text-gray-500">
            育成計画がありません。「育成計画を作成」から開始してください。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    従業員名
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    部署
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    テンプレート
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                    コース進捗
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                    期限
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, idx) => {
                  const progress =
                    plan.total_courses > 0
                      ? Math.round((plan.completed_courses / plan.total_courses) * 100)
                      : 0

                  return (
                    <tr
                      key={plan.id}
                      className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {plan.employee_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {plan.department_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{plan.template_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {plan.completed_courses}/{plan.total_courses}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {plan.due_date ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <TrainingCreatePlanModal
          templates={templates}
          employees={employees}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
