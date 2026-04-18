'use client'

import { History, CheckCircle, XCircle } from 'lucide-react'
import { formatDateTimeInJST } from '@/lib/datetime'

interface AlertLog {
  id: string
  company_id: string
  sent_at: string
  target_serials: string[]
  status: string
  error_message: string | null
  myou_companies: {
    name: string
  } | null
}

interface Props {
  logs: AlertLog[]
}

export default function AlertLogTable({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium italic">通知履歴はありません。</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <History className="h-5 w-5 mr-2 text-blue-600" />
          過去 50 件の通知履歴
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                送信日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                施工会社
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                対象シリアル件数
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                詳細
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {/* date-fns を使わず標準の Date にしても良いが、フォーマットの一貫性のため一応 */}
                  {formatDateTimeInJST(log.sent_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {log.myou_companies?.name || '不明'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-200 mr-2">
                    {log.target_serials?.length || 0}
                  </span>
                  件
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                      log.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {log.status === 'success' ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>成功</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        <span>失敗</span>
                      </>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                  {log.status === 'success'
                    ? log.target_serials?.join(', ') || '-'
                    : log.error_message || '不明なエラー'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
