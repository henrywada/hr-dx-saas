'use client'

import { useState, useTransition } from 'react'
import { deliverFromLot } from '@/features/myou/actions'
import { parseLotQrContent } from '@/features/myou/lib/qr-parser'
import type { LotInventoryItem, MyouCompany, TraceLabel } from '@/features/myou/types'
import QrScanner from './QrScanner'
import TraceQrModal from './TraceQrModal'
import InventoryDeliveryTable from './InventoryDeliveryTable'
import DeliverQuantityModal from './DeliverQuantityModal'

interface DeliveryFormProps {
  companies: MyouCompany[]
  lots: LotInventoryItem[]
}

type DeliveryTab = 'qr' | 'inventory'

type Message = { type: 'success' | 'error' | 'warning'; text: string }

/**
 * 出荷登録フォーム（（株）ミュー → 施工会社、ロット引当）
 * 「QRスキャン」タブ：出荷先・受注数量を指定したうえでロットQRをスキャンし、数量分をロット残数から
 * 引き当てて出荷登録する。
 * 「在庫表より」タブ：在庫一覧（有効期限・ロット番号・在庫残数の昇順）から出荷したいロットの
 * 「出荷」ボタンを押し、数量を指定して同様に出荷登録する。
 * いずれの出荷経路も、ロット残数の減算・出荷履歴登録・トレーサビリティQR発行は Server Action
 * （deliverFromLot → RPC myou_deliver_from_lot）で単一トランザクションとして実行され、
 * 成功時はトレーサビリティQRの印刷モーダルを自動で開く。
 * ロット残数が不足する場合は自動分割せず、別ロットの再スキャン・再選択を促す。
 * 出荷データ履歴の一覧は別画面「出荷リスト」（/myou/delivery-history）を参照。
 */
export default function DeliveryForm({ companies, lots }: DeliveryFormProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [customerOrderNo, setCustomerOrderNo] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<DeliveryTab>('qr')
  const [issuedLabel, setIssuedLabel] = useState<TraceLabel | null>(null)
  const [deliveringItem, setDeliveringItem] = useState<LotInventoryItem | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<Message | null>(null)

  const submitDelivery = (lotNo: string, qty: number, forItem: LotInventoryItem | null) => {
    startTransition(async () => {
      const result = await deliverFromLot({
        lot_no: lotNo,
        company_id: selectedCompanyId,
        quantity: qty,
        customer_order_no: customerOrderNo.trim() || undefined,
      })

      if (result.success && result.label) {
        setMessage({ type: 'success', text: `出荷登録成功: ${lotNo}（${qty}個）` })
        setIssuedLabel(result.label)
        setDeliveringItem(null)
        setModalError(null)
      } else if (forItem) {
        setModalError(result.error || '登録に失敗しました。')
      } else {
        setMessage({ type: 'error', text: result.error || '登録に失敗しました。' })
      }
    })
  }

  const handleScanSuccess = (decodedText: string) => {
    if (isPending) return

    if (!selectedCompanyId) {
      setMessage({ type: 'error', text: '先に出荷先（施工会社）を選択してください。' })
      return
    }
    if (Number.isNaN(quantity) || quantity < 1) {
      setMessage({ type: 'error', text: '受注数量を入力してください。' })
      return
    }

    const { lotNo } = parseLotQrContent(decodedText)
    setMessage(null)
    submitDelivery(lotNo, quantity, null)
  }

  const handleDeliverClick = (item: LotInventoryItem) => {
    if (!selectedCompanyId) {
      setMessage({ type: 'error', text: '先に出荷先（施工会社）を選択してください。' })
      return
    }
    setMessage(null)
    setModalError(null)
    setDeliveringItem(item)
  }

  const handleModalConfirm = (qty: number) => {
    if (!deliveringItem || isPending) return
    submitDelivery(deliveringItem.lot_no, qty, deliveringItem)
  }

  const selectedCompanyName =
    companies.find(company => company.company_id === selectedCompanyId)?.company_name ?? ''

  const messageBanner = message && (
    <div
      className={`p-4 rounded-md ${
        message.type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : message.type === 'warning'
            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      {message.text}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
            出荷先（施工会社）を選択してください
          </label>
          <select
            id="company"
            value={selectedCompanyId}
            onChange={e => setSelectedCompanyId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- 選択してください --</option>
            {companies.map(company => (
              <option key={company.company_id} value={company.company_id}>
                {company.company_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="customer-order-no"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            客先注文番号
          </label>
          <input
            id="customer-order-no"
            type="text"
            value={customerOrderNo}
            onChange={e => setCustomerOrderNo(e.target.value)}
            placeholder="任意"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
            受注数量（缶の本数）
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="border-b border-gray-200 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('qr')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'qr'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          QRスキャン
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          在庫表より
        </button>
      </div>

      {activeTab === 'qr' ? (
        <>
          <div className="relative">
            <QrScanner onScanSuccess={handleScanSuccess} />
            {isPending && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {messageBanner}

          <div className="text-center text-gray-500 text-sm">
            <p>ロットQRコードを枠内に収めてスキャンしてください</p>
            <p className="mt-1">※カメラの使用許可が必要です</p>
            <p className="mt-1">
              残数が不足しているロットをスキャンした場合はエラーになります。別のロットをスキャンしてください。
            </p>
          </div>
        </>
      ) : (
        <>
          {messageBanner}
          <InventoryDeliveryTable
            items={lots}
            onDeliverClick={handleDeliverClick}
            disabled={isPending}
          />
        </>
      )}

      {deliveringItem && (
        <DeliverQuantityModal
          item={deliveringItem}
          companyName={selectedCompanyName}
          defaultQuantity={Math.min(
            Number.isNaN(quantity) || quantity < 1 ? 1 : quantity,
            deliveringItem.quantity_remaining
          )}
          isPending={isPending}
          error={modalError}
          onClose={() => {
            setDeliveringItem(null)
            setModalError(null)
          }}
          onConfirm={handleModalConfirm}
        />
      )}

      {issuedLabel && <TraceQrModal label={issuedLabel} onClose={() => setIssuedLabel(null)} />}
    </div>
  )
}
