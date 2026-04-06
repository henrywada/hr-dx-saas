import { seedOvertimeData } from '../_dev/seed-actions'

/**
 * dev only: テストデータ投入ページ
 * /adm/36analysis/seed にアクセスして投入
 */
export default async function SeedPage() {
  const result = await seedOvertimeData()

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">残業テストデータ投入</h1>
      <div
        className={`p-4 rounded-lg ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
      >
        <p className="font-semibold">{result.success ? '✅ 成功' : '❌ エラー'}</p>
        <p>{result.message}</p>
      </div>
      <a href="/adm/36analysis" className="mt-4 inline-block text-blue-600 underline">
        ← ダッシュボードに戻る
      </a>
    </div>
  )
}
