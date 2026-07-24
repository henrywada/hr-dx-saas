'use client'

import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { DeliveryHistoryRow, MyouCompany } from '@/features/myou/types'
import { getDaysUntilExpiration } from '@/features/myou/lib/expiration'
import { History } from 'lucide-react'
import UsedQuantityEditModal from './UsedQuantityEditModal'

interface DeliveryHistoryTableProps {
  logs: DeliveryHistoryRow[]
  companies: MyouCompany[]
}

/**
 * 出荷リスト画面（/myou/delivery-history）。出荷データ履歴（myou_delivery_logs）を
 * 出荷日・登録日時の新しい順（queries.getDeliveryLogs() 側で確定済み）に一覧表示し、
 * 出荷先（施工会社）での絞り込みができる。
 */
export default function DeliveryHistoryTable({ logs, companies }: DeliveryHistoryTableProps) {
  const [companyFilter, setCompanyFilter] = useState<string>('')
  const [editingLog, setEditingLog] = useState<DeliveryHistoryRow | null>(null)

  const filteredLogs = useMemo(
    () => (companyFilter ? logs.filter(log => log.company_id === companyFilter) : logs),
    [logs, companyFilter]
  )

  const columns: Column<DeliveryHistoryRow>[] = [
    {
      key: 'delivery_date',
      label: '出荷日',
      sortable: true,
    },
    {
      key: 'lot_no',
      label: 'ロット番号',
      sortable: true,
      render: value => <span className="font-mono">{value}</span>,
    },
    {
      key: 'trace_no',
      label: 'トレースNo',
      sortable: true,
      render: value => <span className="font-mono">{value || '-'}</span>,
    },
    {
      key: 'company_no',
      label: '得意先No',
      sortable: true,
      render: value => <span className="font-mono">{value ?? '-'}</span>,
    },
    {
      key: 'company_name',
      label: '出荷先',
      sortable: true,
    },
    {
      key: 'customer_order_no',
      label: '客先注文番号',
      render: value => value || '-',
    },
    {
      key: 'quantity',
      label: '出荷数量',
      render: value => `${value}個`,
    },
    {
      key: 'used_quantity',
      label: '使用数',
      render: value => `${value}個`,
    },
    {
      key: 'expiration_date',
      label: '期限状況',
      render: (_value, item) => {
        // 出荷数量＝使用数なら期限管理対象外として「-」
        if (item.quantity === item.used_quantity) {
          return '-'
        }
        const daysLeft = getDaysUntilExpiration(item.expiration_date)
        if (daysLeft === null) {
          return (
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              期限未設定
            </span>
          )
        }
        if (daysLeft <= 0) {
          return (
            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">
              期限切れ
            </span>
          )
        }
        if (daysLeft <= 30) {
          return (
            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700 font-medium">
              残り{daysLeft}日
            </span>
          )
        }
        return (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
            残り{daysLeft}日
          </span>
        )
      },
    },
    {
      key: 'id',
      label: '編集',
      render: (_value, item) => (
        <button
          type="button"
          onClick={() => setEditingLog(item)}
          className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          編集
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <label htmlFor="company-filter" className="block text-sm font-medium text-gray-700 mb-2">
          出荷先で絞り込む
        </label>
        <select
          id="company-filter"
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">すべての出荷先</option>
          {companies.map(company => (
            <option key={company.company_id} value={company.company_id}>
              {company.company_name}
            </option>
          ))}
        </select>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 font-medium">
            {companyFilter
              ? '該当する出荷データ履歴はありません。'
              : '出荷データ履歴はありません。'}
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredLogs}
          searchable={true}
          searchPlaceholder="ロット番号で検索..."
          searchKey="lot_no"
          getRowId={item => item.id}
          footer={
            <tr className="bg-accent-teal border-t-2 border-[#e2e6ec] font-semibold">
              <td className="px-4 py-1 text-sm text-[#24292f]">合計</td>
              <td className="px-4 py-1" />
              <td className="px-4 py-1" />
              <td className="px-4 py-1" />
              <td className="px-4 py-1" />
              <td className="px-4 py-1" />
              <td className="px-4 py-1 text-sm text-[#24292f]">
                {filteredLogs.reduce((sum, log) => sum + log.quantity, 0)}個
              </td>
              <td className="px-4 py-1 text-sm text-[#24292f]">
                {filteredLogs.reduce((sum, log) => sum + log.used_quantity, 0)}個
              </td>
              <td className="px-4 py-1" />
              <td className="px-4 py-1" />
            </tr>
          }
        />
      )}

      {editingLog ? (
        <UsedQuantityEditModal
          open
          onOpenChange={open => {
            if (!open) setEditingLog(null)
          }}
          log={editingLog}
        />
      ) : null}
    </div>
  )
}
