import LabelIssueForm from '../components/LabelIssueForm'
import MyouBackLink from '../components/MyouBackLink'
import { Metadata } from 'next'
import { QrCode } from 'lucide-react'

export const metadata: Metadata = {
  title: '製造ロットQR発行',
  description: 'ロット番号を採番し、有効期限を埋め込んだ製造ロットQRコードを生成・印刷します。',
}

export default function LabelsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-8 flex items-start justify-between print:hidden">
        <h1 className="text-2xl font-bold text-blue-700 flex items-center">
          <QrCode className="h-6 w-6 mr-2" />
          製造ロットQR発行
        </h1>
        <div className="flex flex-col items-end gap-1">
          <MyouBackLink />
          <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
            製品トレーサビリティ
          </div>
        </div>
      </div>

      <LabelIssueForm />

      <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200 print:hidden">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">💡 操作ガイド</h3>
        <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
          <li>
            有効期限と発行件数を指定すると、ロット番号（LOT-日付-連番）が自動採番されます。1件＝段ボール1箱分のQRです。
          </li>
          <li>
            この時点では缶の本数（数量）は確定しません。入荷登録画面でロットQRをスキャンし、数量を入力して在庫として確定してください。
          </li>
          <li>「印刷する」ボタンでラベルシートを印刷し、段ボールに貼付してください。</li>
          <li>
            QRコードにはロット番号・製造日・有効期限が埋め込まれています（LOT:xxx,MFG:yyyy-mm-dd,EXP:yyyy-mm-dd
            形式）。
          </li>
        </ul>
      </div>
    </div>
  )
}
