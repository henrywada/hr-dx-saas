import { Suspense } from 'react'
import { getExpiringTraceLabels, getAlertLogs } from '@/features/myou/queries'
import ExpiringTraceLabelsTable from '../components/ExpiringTraceLabelsTable'
import AlertLogTable from '../components/AlertLogTable'
import MyouBackLink from '../components/MyouBackLink'
import { formatDateInJST } from '@/lib/datetime'
import { Metadata } from 'next'
import { AlertTriangle, History, Calendar } from 'lucide-react'

export const metadata: Metadata = {
  title: '製品有効期限監視・アラート管理',
  description: '有効期限が近い出荷済み製品を把握し、施工会社へアラートを送信します。',
}

export default async function ExpirationAlertsPage() {
  // 並列でデータを取得
  const [labels, logs] = await Promise.all([getExpiringTraceLabels(), getAlertLogs()])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヒーローセクション風のヘッダー */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-end mb-2">
            <MyouBackLink variant="light" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <nav className="flex mb-3 text-blue-200 text-xs font-medium space-x-2">
                <span>製品トレーサビリティ</span>
                <span>/</span>
                <span className="text-white">有効期限監視</span>
              </nav>
              <h1 className="text-3xl font-extrabold flex items-center tracking-tight text-white">
                <AlertTriangle className="h-8 w-8 mr-3 text-yellow-400" />
                有効期限監視
              </h1>
              <p className="mt-2 text-blue-100 max-w-xl text-sm leading-relaxed">
                出荷済み製品のうち有効期限が30日以内のものを一覧表示します。
                期限切れ間近の製品がある場合、各施工会社へ注意喚起メールを送信・管理できます。
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-blue-100 text-[10px] uppercase font-bold tracking-wider mb-1">
                  アラート対象
                </div>
                <div className="text-2xl font-black text-white leading-none">
                  {labels.length}
                  <span className="text-sm font-normal ml-1">件</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <div className="text-blue-100 text-[10px] uppercase font-bold tracking-wider mb-1">
                  直近送信
                </div>
                <div className="text-sm font-bold text-white leading-none">
                  {logs.length > 0 ? formatDateInJST(logs[0].sent_at) : '履歴なし'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* 有効期限間近セクション */}
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-8 w-1 bg-blue-600 rounded"></div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              期限間近の製品（残り30日以内）
            </h2>
          </div>

          <Suspense
            fallback={
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">データを読み込んでいます...</p>
              </div>
            }
          >
            <ExpiringTraceLabelsTable labels={labels} />
          </Suspense>
        </section>

        {/* 通知履歴セクション */}
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-8 w-1 bg-indigo-600 rounded"></div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <History className="h-5 w-5 mr-2 text-indigo-600" />
              アラート送信履歴
            </h2>
          </div>

          <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-xl"></div>}>
            <AlertLogTable logs={logs} />
          </Suspense>
        </section>

        {/* フッター補足説明 */}
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
          <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
            <span className="bg-blue-200 text-blue-900 rounded-full w-5 h-5 flex items-center justify-center text-[10px] mr-2">
              i
            </span>
            システム運用について
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-xs text-blue-800 leading-relaxed">
            <div className="space-y-2">
              <p className="font-bold underline">監視対象</p>
              <p>
                この画面を開いた時点のトレーサビリティQR発行履歴を集計しています。客先へ出荷済みで有効期限が30日以内のものが対象です。
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-bold underline">メール配信</p>
              <p>
                施工会社情報に登録されているメールアドレスへ、対象製品一覧が送信されます。アドレスが未設定の場合は送信されません。
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-bold underline">手動送信の運用</p>
              <p>
                メールは自動では送信されません。担当者がこの画面を定期的に確認し、上記の「アラート送信」ボタンから施工会社へ通知してください。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
