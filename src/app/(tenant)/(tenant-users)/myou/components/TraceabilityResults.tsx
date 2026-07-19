'use client'

import {
  Package,
  Truck,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Warehouse,
  Hash,
} from 'lucide-react'
import { formatDateTimeInJST } from '@/lib/datetime'
import {
  MYOU_LOT_STATUS_LABELS,
  type LotTraceResult,
  type MyouLotStatus,
} from '@/features/myou/types'

interface TraceabilityResultsProps {
  data: LotTraceResult | null
  searched: boolean
}

/** ステータスに応じたバッジ配色を返す */
function statusBadgeClass(status: MyouLotStatus): string {
  switch (status) {
    case 'depleted':
      return 'bg-green-100 text-green-700'
    case 'in_stock':
      return 'bg-blue-100 text-blue-700'
    case 'issued':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function TraceabilityResults({ data, searched }: TraceabilityResultsProps) {
  if (!searched) return null

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800 mb-2">ロットが見つかりません</h3>
        <p className="text-sm text-red-600">
          入力されたロット番号／TraceNoはデータベースに登録されていないか、正しくありません。
          番号を再度お確かめください。
        </p>
      </div>
    )
  }

  const { lot, history } = data
  const status = lot.status

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ロット基本情報カード */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <h3 className="text-white font-bold flex items-center">
            <Package className="h-5 w-5 mr-2" />
            ロットステータス
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">ロット番号</p>
            <p className="text-xl font-mono font-black text-gray-900">{lot.lot_no}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">有効期限</p>
            <p
              className={`text-lg font-bold flex items-center ${
                lot.expiration_date && new Date(lot.expiration_date) < new Date()
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {lot.expiration_date ?? '未設定'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              在庫数量（残数 / 総数）
            </p>
            <p className="text-lg font-bold text-gray-900 flex items-center">
              <Warehouse className="h-4 w-4 mr-2" />
              {lot.quantity_remaining} / {lot.quantity_total}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">現在の状態</p>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold shadow-sm ${statusBadgeClass(status)}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {MYOU_LOT_STATUS_LABELS[status] ?? lot.status}
            </span>
          </div>
        </div>
      </div>

      {/* 出荷履歴タイムライン */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center pl-1">
          <Truck className="h-5 w-5 mr-2 text-blue-600" />
          出荷履歴タイムライン
        </h3>

        <div className="relative">
          {/* 垂直ライン */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-8 relative">
            {history.length > 0 ? (
              history.map((log, index) => (
                <div key={log.id} className="flex group">
                  {/* アイコン */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white shadow-md transition-transform group-hover:scale-110 ${
                      index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <MapPin className="h-6 w-6" />
                  </div>

                  {/* コンテンツ */}
                  <div className="flex-grow ml-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all group-hover:shadow-md group-hover:border-blue-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                      <h4 className="text-lg font-black text-gray-900 flex items-center">
                        {log.myou_companies?.name ?? '（不明な出荷先）'}
                        {index === 0 && (
                          <span className="ml-3 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                            最終出荷先
                          </span>
                        )}
                      </h4>
                      <div className="text-sm font-medium text-blue-600 flex items-center mt-1 md:mt-0">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        出荷日: {formatDateTimeInJST(log.delivery_date)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4 border-t border-gray-50 pt-4">
                      <div className="flex items-center text-gray-600">
                        <Package className="h-4 w-4 mr-2 text-gray-400" />
                        出荷数量:{' '}
                        <span className="font-semibold text-gray-900 ml-1">{log.quantity}個</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        登録担当者:{' '}
                        <span className="font-semibold text-gray-900 ml-1">
                          {log.delivered_by || 'システム登録'}
                        </span>
                      </div>
                      {log.customer_order_no && (
                        <div className="flex items-center text-gray-600">
                          <Hash className="h-4 w-4 mr-2 text-gray-400" />
                          客先注文番号:{' '}
                          <span className="font-semibold text-gray-900 ml-1">
                            {log.customer_order_no}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center space-x-6">
                <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-gray-100 text-gray-400 shadow-sm">
                  <Package className="h-6 w-6" />
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-dashed border-gray-300 flex-grow italic text-gray-500">
                  出荷履歴がまだありません。
                  {status === 'in_stock'
                    ? '入荷済み・在庫状態です。'
                    : 'ロットQR発行済みの状態です。'}
                </div>
              </div>
            )}

            {/* 起点（入荷 or ロットQR発行） */}
            <div className="flex">
              <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-green-500 text-white shadow-md">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-grow ml-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm self-center">
                <p className="font-black text-gray-900">
                  {lot.received_at ? `入荷（仕入納入）: ${lot.received_at}` : '製造・検品完了'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {lot.received_at
                    ? `総数 ${lot.quantity_total}個 を入荷登録しました。`
                    : '製造ロットQRが発行されました（数量未確定）。'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 認証済み証跡 */}
      <div className="bg-green-50 rounded-2xl p-6 border border-green-100 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-green-500 p-2 rounded-full mr-4">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h4 className="text-green-900 font-black">トレーサビリティ記録あり</h4>
            <p className="text-green-700 text-xs mt-0.5">
              このロットの入荷・出荷イベントはデータベースに記録されています。
            </p>
          </div>
        </div>
        <div className="hidden sm:block">
          <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-200/50 px-3 py-1 rounded-full">
            Secure Trace
          </div>
        </div>
      </div>
    </div>
  )
}
