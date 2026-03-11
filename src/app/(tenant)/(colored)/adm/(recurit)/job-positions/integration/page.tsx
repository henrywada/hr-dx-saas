import { getServerUser } from '@/lib/auth/server-user'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata = {
  title: '無料求人サイト連携 | Smart HR App',
}

export default async function SyndicationPage() {
  const serverUser = await getServerUser()
  
  if (!serverUser || !serverUser.tenant_id) {
    notFound()
  }

  const tenantId = serverUser.tenant_id
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const xmlFeedUrl = `${baseUrl}/api/feed/${tenantId}`

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/adm/job-positions" className="hover:underline">求人票管理</Link>
          <span>/</span>
          <span>無料求人サイト自動連携 (Integration)</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">🚀 無料求人サイト自動連携</h1>
        <p className="text-sm text-gray-500 mt-1">
          公開中の求人票を、アグリゲーター型求人エンジン（Indeed, スタンバイ, 求人ボックス 等）や検索エンジン（Google for Jobs）に自動連携・配信するための設定です。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* XMLフィード連携パネル */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4 text-blue-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            <h2 className="text-lg font-bold">XMLフィード連携 (Indeedなど)</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Indeed, スタンバイ, 求人ボックス などのアグリゲーションサイトには、このXMLフィードURLをご提出いただくことで、1日に数回自動的に求人情報が吸い上げられます。
          </p>
          <div className="bg-gray-50 p-3 rounded border text-sm font-mono text-gray-800 break-all mb-3">
            {xmlFeedUrl}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            ※ 上記URLには「ステータスが公開中」の求人のみが含まれます。
          </p>
          <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded text-sm font-semibold transition"
            // クライアント側でクリップボードへコピーするために、本来はClient Componentへ分離するか onClick を使う
          >
            URLをコピーする
          </button>
        </div>

        {/* Google for Jobs パネル */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4 text-green-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <h2 className="text-lg font-bold">Google for Jobs 連携</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Googleしごと検索（Google for Jobs）に対しては、専用の構造化データ（JSON-LD）を公開求人ページ内に自動で埋め込んでいるため、追加の設定は不要です。<br/><br/>
            Googlebotが巡回したタイミングで自動的に検索結果にインデックスされます。
          </p>
          <div className="flex items-center gap-2 mt-auto pt-4 border-t">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-gray-700">JSON-LD 構造化データ：<strong>有効</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}
