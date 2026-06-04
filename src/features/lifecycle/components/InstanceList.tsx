'use client'

import type { InstanceRow } from '../types'

interface Props {
  instances: InstanceRow[]
  onSelectInstance: (id: string) => void
}

const statusLabel: Record<string, string> = {
  in_progress: '対応中',
  completed: '完了',
  cancelled: 'キャンセル',
}

const statusClass: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function InstanceList({ instances, onSelectInstance }: Props) {
  if (instances.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-500">
          フローはまだありません。上部のボタンから開始してください。
        </p>
      </div>
    )
  }

  return (
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
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                ステータス
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                進捗
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                予定日
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800 w-20">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst, idx) => {
              const progress =
                inst.total_tasks > 0
                  ? Math.round((inst.completed_tasks / inst.total_tasks) * 100)
                  : 0

              return (
                <tr
                  key={inst.id}
                  className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {inst.employee_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {inst.department_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass[inst.status] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {statusLabel[inst.status] ?? inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {inst.completed_tasks}/{inst.total_tasks}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {inst.scheduled_date ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onSelectInstance(inst.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      タスク確認
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
