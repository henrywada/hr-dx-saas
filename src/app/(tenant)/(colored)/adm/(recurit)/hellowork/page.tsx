import { getTenantJobPostings } from '@/features/job-postings/queries'
import { HelloWorkExportUI } from '@/features/job-postings/components/HelloWorkExportUI'
import Link from 'next/link'

export const metadata = {
  title: 'ハローワーク用CSV作成 | Smart HR App',
}

export default async function HelloWorkPage() {
  // DBから自テナントの求人を取得する (Server Component側で実行)
  const jobs = await getTenantJobPostings()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/adm/job-positions" className="hover:underline">求人票管理</Link>
          <span>/</span>
          <span>ハローワーク用CSV作成</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏢</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ハローワーク用CSV作成</h1>
            <p className="text-sm text-gray-500 mt-1">選択した求人票データから、ハローワークのシステムへ一括登録可能なCSVを生成・出力します。</p>
          </div>
        </div>
      </div>

      <HelloWorkExportUI jobs={jobs} />

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-lg p-5">
        <h4 className="font-bold text-blue-900 mb-2">💡 出力したCSVの利用方法</h4>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
          <li>上記のリストから出力したい求人を選択し、「選択した求人をCSV出力」ボタンをクリックしてダウンロードします。</li>
          <li>ダウンロードしたファイルは文字化け防止処理（BOM）済みですが、Excel等で開く際はご注意ください。</li>
          <li>ハローワークインターネットサービスの「事業主事業所ページ」へログインします。</li>
          <li>「求人情報の登録・変更」からCSV一括アップロードメニューへ進み、ダウンロードしたCSVを読み込ませてください。</li>
        </ol>
      </div>
    </div>
  )
}
