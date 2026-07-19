'use client'

import { useMemo, useState } from 'react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { DeliveryHistoryRow, MyouCompany } from '@/features/myou/types'
import { History } from 'lucide-react'

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
      key: 'delivered_by',
      label: '登録担当者',
      render: value => value || 'システム登録',
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
              <td className="px-4 py-1" />
            </tr>
          }
        />
      )}
    </div>
  )
}
