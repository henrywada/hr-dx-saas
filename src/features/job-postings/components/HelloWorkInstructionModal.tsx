'use client'

import { X, Download, LogIn, Upload } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function HelloWorkInstructionModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">ハローワークへの一括登録手順</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
            aria-label="閉じる"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 font-bold mb-auto">
              1
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <Download size={18} className="text-blue-500" />
                当システムからCSVをダウンロードする
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                出力画面でハローワークに登録したい求人を選択し、「選択した求人をCSV出力」ボタンをクリックしてください。<br/>
                <span className="text-xs text-gray-500">※ハローワーク側での文字化けを防ぐため、システム側で自動的にBOM（バイトオーダーマーク）付きのUTF-8形式で出力されます。</span>
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600 font-bold mb-auto">
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <LogIn size={18} className="text-green-500" />
                ハローワーク事業主マイページにログインする
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                お手元のブラウザ（別のタブ等）で、ハローワークインターネットサービスの「事業主事業所ページ」へアクセスし、ログインします。
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold mb-auto">
              3
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                「求人情報」メニューから「一括登録」を選択
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                ログイン後のマイページ上部メニューにある「求人区分」または「求人情報」の管理メニューから、CSVファイルを使った「一括登録（アップロード）」の画面へ進んでください。<br/>
                <span className="text-xs text-gray-500">※ハローワークのUI変更により、メニュー名が若干異なる場合があります。</span>
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold mb-auto">
              4
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <Upload size={18} className="text-orange-500" />
                ダウンロードしたCSVファイルをアップロードして完了！
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                「ファイルを選択」ボタンを押し、Step 1でダウンロードしたCSVファイル（<code className="bg-gray-100 px-1 rounded text-pink-600">hellowork_export_YYYY-MM-DD.csv</code>）を選択してアップロードします。<br/>
                エラーがなければ、これでハローワークへの求人票の一括登録・更新は完了です！
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-5 border-t bg-gray-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white font-medium rounded shadow hover:bg-gray-700 transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
