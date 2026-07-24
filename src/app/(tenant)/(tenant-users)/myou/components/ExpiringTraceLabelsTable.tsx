'use client'

import { useTransition, useState } from 'react'
import { sendManualAlert } from '@/features/myou/actions'
import type { ExpiringTraceLabel } from '@/features/myou/types'
import { getDaysUntilExpiration } from '@/features/myou/lib/expiration'
import { processStatusLabel, type ProcessStatus } from '@/features/myou/lib/process-status'
import ProcessStatusEditModal from './ProcessStatusEditModal'
import { Bell, Mail, CheckCircle, AlertCircle, Loader2, Pencil } from 'lucide-react'

type EditingLabel = Pick<ExpiringTraceLabel, 'id' | 'trace_no' | 'process_status'>

function processStatusBadgeClass(status: ProcessStatus): string {
  switch (status) {
    case 'unused':
      return 'bg-blue-100 text-blue-700'
    case 'used':
      return 'bg-gray-100 text-gray-700'
    case 'alert_ignored':
      return 'bg-slate-100 text-slate-700'
  }
}

interface Props {
  labels: ExpiringTraceLabel[]
}

export default function ExpiringTraceLabelsTable({ labels }: Props) {
  const [isPending, startTransition] = useTransition()
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [editingLabel, setEditingLabel] = useState<EditingLabel | null>(null)

  // 会社ごとにグループ化（出荷先情報が欠落しているレコードは表示対象外）
  const groupedByCompany = labels.reduce(
    (acc, label) => {
      const company = label.myou_companies
      if (!company) return acc
      if (!acc[company.id]) {
        acc[company.id] = {
          name: company.name,
          email: company.email_address ?? '',
          labels: [],
        }
      }
      acc[company.id].labels.push(label)
      return acc
    },
    {} as Record<string, { name: string; email: string; labels: ExpiringTraceLabel[] }>
  )

  const handleSendAlert = (companyId: string) => {
    setActiveCompanyId(companyId)
    setResult(null)

    startTransition(async () => {
      const response = await sendManualAlert(companyId)
      if (response.success) {
        setResult({ type: 'success', message: 'アラートメールを送信しました。' })
      } else {
        setResult({ type: 'error', message: response.error || '送信に失敗しました。' })
      }
      setActiveCompanyId(null)
    })
  }

  if (labels.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium">現在、期限間近の出荷分はありません。</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {result && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-3 ${
            result.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {result.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{result.message}</span>
          <button onClick={() => setResult(null)} className="ml-auto text-xs underline">
            閉じる
          </button>
        </div>
      )}

      {Object.entries(groupedByCompany).map(([companyId, company]) => (
        <div
          key={companyId}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                <Mail className="h-3 w-3 mr-1" /> {company.email || 'メールアドレス未設定'}
              </p>
            </div>
            <button
              onClick={() => handleSendAlert(companyId)}
              disabled={isPending || !company.email}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isPending && activeCompanyId === companyId
                  ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:transform active:scale-95 disabled:opacity-50 disabled:bg-gray-400'
              }`}
            >
              {isPending && activeCompanyId === companyId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>送信中...</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>アラート送信</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TraceNo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ロット番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    未使用数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    有効期限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    残り日数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    処理ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    編集
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {company.labels.map(label => {
                  const daysLeft = getDaysUntilExpiration(label.expiration_date) ?? 0
                  return (
                    <tr key={label.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {label.trace_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                        {label.lot_no}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {label.unused_quantity}個
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {label.expiration_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            daysLeft <= 7
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {daysLeft <= 0 ? '期限切れ' : '期限間近'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {daysLeft > 0 ? `${daysLeft}日` : '0日'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${processStatusBadgeClass(label.process_status)}`}
                        >
                          {processStatusLabel(label.process_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingLabel({
                              id: label.id,
                              trace_no: label.trace_no,
                              process_status: label.process_status,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                          編集
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {editingLabel && (
        <ProcessStatusEditModal
          open={!!editingLabel}
          onOpenChange={open => {
            if (!open) setEditingLabel(null)
          }}
          label={editingLabel}
        />
      )}
    </div>
  )
}
