'use client'

import { useRef, useState, useTransition } from 'react'
import { deliverFromLot } from '@/features/myou/actions'
import { prepareDeliveryScan } from '@/features/myou/lib/delivery-scan'
import { toJSTDateString } from '@/lib/datetime'
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

/** 有効期限の初期値（本日 + 2年）をJST基準のYYYY-MM-DDで返す */
function getDefaultExpirationDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 2)
  return toJSTDateString(date)
}

/**
 * 出荷登録フォーム（（株）ミュー → 施工会社、ロット引当）
 * 「QRスキャン」タブ：出荷先・受注数量・有効期限を指定したうえでロットQRをスキャンし、数量分を
 * ロット残数から引き当てて出荷登録する。
 * 「在庫表より」タブ：在庫一覧（入庫日・ロット番号・在庫残数の昇順）から出荷したいロットの
 * 「出荷」ボタンを押し、数量・有効期限（共通欄の値を初期値に、モーダル内で上書き可）を指定して
 * 同様に出荷登録する。
 * 有効期限はロット（入荷）側では扱わず、出荷（トレーサビリティラベル発行）のたびに入力する。
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
  const [expirationDate, setExpirationDate] = useState(getDefaultExpirationDate)
  const [activeTab, setActiveTab] = useState<DeliveryTab>('inventory')
  const [issuedLabel, setIssuedLabel] = useState<TraceLabel | null>(null)
  const [deliveringItem, setDeliveringItem] = useState<LotInventoryItem | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<Message | null>(null)
  const [lastScannedLot, setLastScannedLot] = useState('')
  const [manualQrText, setManualQrText] = useState('')
  const processingRef = useRef(false)

  const submitDelivery = (
    lotNo: string,
    qty: number,
    forItem: LotInventoryItem | null,
    expDate: string
  ) => {
    startTransition(async () => {
      try {
        const result = await deliverFromLot({
          lot_no: lotNo,
          company_id: selectedCompanyId,
          quantity: qty,
          expiration_date: expDate,
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
      } finally {
        processingRef.current = false
      }
    })
  }

  const applyDecodedText = (decodedText: string) => {
    const result = prepareDeliveryScan({
      decodedText,
      selectedCompanyId,
      quantity,
      expirationDate,
    })
    if (result.lotNo) setLastScannedLot(result.lotNo)

    if (result.ok === false) {
      setMessage({ type: 'error', text: result.error })
      if (!selectedCompanyId) {
        document.getElementById('company')?.focus()
      }
      return
    }
    if (processingRef.current) {
      setMessage({ type: 'warning', text: '出荷処理中です。完了するまでお待ちください。' })
      return
    }
    processingRef.current = true
    setMessage(null)
    submitDelivery(result.lotNo, quantity, null, expirationDate)
  }

  const handleScanSuccess = (decodedText: string) => {
    applyDecodedText(decodedText)
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

  const handleModalConfirm = (qty: number, expDate: string) => {
    if (!deliveringItem || isPending) return
    submitDelivery(deliveringItem.lot_no, qty, deliveringItem, expDate)
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
            className={`w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
              !selectedCompanyId && message?.text.includes('出荷先')
                ? 'border-red-400 ring-2 ring-red-200'
                : 'border-gray-300'
            }`}
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
        <div>
          <label htmlFor="expiration-date" className="block text-sm font-medium text-gray-700 mb-2">
            有効期限
          </label>
          <input
            id="expiration-date"
            type="date"
            value={expirationDate}
            onChange={e => setExpirationDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="border-b border-gray-200 flex gap-2">
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
      </div>

      {activeTab === 'qr' ? (
        <>
          {messageBanner}

          {lastScannedLot && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">直前のスキャン内容:</h3>
              <p className="text-xs text-blue-800">ロット番号: {lastScannedLot}</p>
            </div>
          )}

          <div className="relative">
            <QrScanner onScanSuccess={handleScanSuccess} />
            {isPending && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={e => {
              e.preventDefault()
              if (manualQrText.trim()) applyDecodedText(manualQrText.trim())
            }}
          >
            <input
              id="manual-qr-text"
              type="text"
              value={manualQrText}
              onChange={e => setManualQrText(e.target.value)}
              aria-label="QR内容の手入力"
              placeholder="カメラが使えないときは QR内容を貼り付け（例: LOT:LOT-20260820-0001,MFG:2026-08-20）"
              className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              読み取る
            </button>
          </form>

          <div className="text-center text-gray-500 text-sm">
            <p>カメラ許可のボタンを押してから、ロットQRコードを枠内に収めてスキャンしてください</p>
            <p className="mt-1">
              カメラが使えない場合は、上の入力欄にQR内容を貼り付けるか、画像ファイルから読み取れます
            </p>
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
          defaultExpirationDate={expirationDate}
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
