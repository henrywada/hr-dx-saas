'use client'

import { useState, useTransition } from 'react'
import { HighStressEmployee, DivisionNode } from '@/features/adm/high-stress/queries'
import { updateInterviewRecord } from '@/features/adm/high-stress/actions'
import { formatDateInJST } from '@/lib/datetime'
import {
  UserCog,
  FileWarning,
  CalendarCheck,
  CheckCircle2,
  Clock,
  X,
  BarChart2,
} from 'lucide-react'
import HighStressLayerChart from '@/features/adm/high-stress/components/HighStressLayerChart'

interface Props {
  data: HighStressEmployee[]
  periodId: string
  isDoctor: false // 人事用は常に false
  divisionStats: DivisionNode[]
  submissionCounts: Record<string, number>
}

const STATUS_LABELS: Record<string, string> = {
  pending: '未対応',
  scheduled: '面談予定',
  completed: '面談実施済',
  cancelled: 'キャンセル',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

export default function HighStressClient({
  data,
  periodId,
  isDoctor,
  divisionStats,
  submissionCounts,
}: Props) {
  const [selectedUser, setSelectedUser] = useState<HighStressEmployee | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [status, setStatus] = useState<string>('pending')
  const [date, setDate] = useState<string>('')

  // 組織層セレクター用（null = 全て = ルート表示）
  const allLayers = Array.from(
    new Set(divisionStats.filter(d => d.layer != null).map(d => d.layer as number))
  ).sort((a, b) => a - b)
  const [selectedLayer, setSelectedLayer] = useState<number | null>(
    allLayers[allLayers.length - 1] ?? null
  )

  const handleOpenDetail = (emp: HighStressEmployee) => {
    setSelectedUser(emp)
    const rec = emp.interview_record
    setStatus(rec?.interview_status || 'pending')
    setDate(rec?.interview_date || '')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    startTransition(async () => {
      try {
        await updateInterviewRecord(periodId, selectedUser.employee_id, selectedUser.result_id, {
          interview_status: status,
          interview_date: date,
          doctor_opinion: null,
          work_measures: null,
          measure_details: null,
        })
        alert('面談記録を保存しました。')
        setIsModalOpen(false)
      } catch (err: unknown) {
        alert((err as Error).message || '更新中にエラーが発生しました。')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-gradient-to-b from-rose-500 to-red-600 rounded-full" />
            対象者リスト
          </h2>
          <p className="text-sm text-gray-500 mt-1 pl-4">
            「高ストレス」判定で、事業者への結果提供に同意した従業員のみ表示されています。
            （あなたは人事担当としてステータスのみ閲覧可能です）
          </p>
        </div>
        <div className="flex gap-4 text-center text-sm font-medium text-gray-500">
          <div>
            <div className="text-2xl font-black text-gray-800">{data.length}</div>
            <div>抽出数</div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600">
              {data.filter(d => d.interview_requested).length}
            </div>
            <div>面談希望</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold">社員名 / No.</th>
                <th className="px-6 py-4 font-semibold">部署</th>
                <th className="px-6 py-4 font-semibold">拠点</th>
                <th className="px-6 py-4 font-semibold">面談希望 (本人)</th>
                <th className="px-6 py-4 font-semibold">ステータス表示</th>
                <th className="px-6 py-4 font-semibold text-right">アクション</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    対象となる高ストレス者はいません。
                  </td>
                </tr>
              ) : (
                data.map(emp => (
                  <tr key={emp.employee_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{emp.name}</div>
                      <div className="text-xs text-gray-400">{emp.employee_no || 'No未設定'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {emp.division_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {emp.establishment_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.interview_requested ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-full">
                          <FileWarning className="w-3.5 h-3.5" />
                          希望あり
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">希望なし</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[emp.interview_record?.interview_status || 'pending']}`}
                      >
                        {STATUS_LABELS[emp.interview_record?.interview_status || 'pending']}
                      </span>
                      {emp.interview_record?.interview_date && (
                        <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {emp.interview_record.interview_date}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleOpenDetail(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                      >
                        <UserCog className="w-3.5 h-3.5" />
                        状況確認
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 組織層別チャート */}
      {divisionStats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-bold text-gray-700 whitespace-nowrap">
              <BarChart2 className="w-4 h-4 text-indigo-500" />
              組織層を選択
            </span>
            <select
              value={selectedLayer ?? ''}
              onChange={e => {
                const v = e.target.value
                setSelectedLayer(v === '' ? null : Number(v))
              }}
              className="text-sm rounded-lg border border-gray-200 py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white text-gray-700"
            >
              <option value="">全て</option>
              {allLayers.map(layer => (
                <option key={layer} value={layer}>
                  層{layer}
                </option>
              ))}
            </select>
          </div>
          <HighStressLayerChart
            data={data}
            divisionStats={divisionStats}
            submissionCounts={submissionCounts}
            targetLayer={selectedLayer}
          />
        </div>
      )}

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                <UserCog className="text-gray-600 w-5 h-5" />
                面談サポート・記録管理
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex justify-between">
                <div>
                  <div className="text-xs text-blue-800 font-semibold uppercase tracking-wider mb-1">
                    対象社員
                  </div>
                  <div className="text-xl font-bold text-gray-900">{selectedUser.name}</div>
                  <div className="text-sm text-gray-600 mt-0.5">
                    {selectedUser.division_name || '部署未設定'}
                  </div>
                  {selectedUser.establishment_name && (
                    <div className="text-xs text-teal-700 mt-1">
                      拠点: {selectedUser.establishment_name}
                    </div>
                  )}
                </div>
                {selectedUser.interview_requested && (
                  <div className="text-right flex flex-col items-end">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 rounded-full">
                      <FileWarning className="w-3.5 h-3.5" />
                      面談希望あり
                    </span>
                    <span className="text-xs text-gray-400 mt-2">
                      {selectedUser.interview_requested_at
                        ? formatDateInJST(selectedUser.interview_requested_at)
                        : ''}
                    </span>
                  </div>
                )}
              </div>

              <form id="record-form" onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">面談ステータス</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full text-sm rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="pending">未対応</option>
                      <option value="scheduled">面談予定</option>
                      <option value="completed">面談実施済</option>
                      <option value="cancelled">キャンセル</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      面談（実施/予定）日
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full text-sm rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs leading-relaxed border border-yellow-200">
                  <span className="font-bold block mb-1">閲覧制限</span>
                  人事担当者は産業医の具体的な意見や就業上の詳細な措置内容などの機密データを入力・閲覧することはできません。ステータスの確認およびステータス日程の更新のみが許可されています。
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition"
              >
                キャンセル
              </button>
              <button
                type="submit"
                form="record-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition disabled:opacity-50"
              >
                {isPending ? (
                  <span className="animate-pulse">保存中...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    内容を保存する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
