import { getTenantJobPostings } from '@/features/job-postings/queries'
import Link from 'next/link'
import { CreateJobDraftButton } from '@/features/job-postings/components/CreateJobDraftButton'
import { DeleteJobButton } from '@/features/job-postings/components/DeleteJobButton'
import { formatDateTimeInJST } from '@/lib/datetime'

export const metadata = {
  title: '求人票管理 (Job Positions) | Smart HR App',
}

export default async function JobPositionsPage() {
  const jobs = await getTenantJobPostings()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">求人票管理</h1>
          <p className="text-sm text-gray-500 mt-1">【無料求人サイトへ自動連携】：ステータス「公開中」の求人を、無料の求人サイトへ自動掲載します。</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/adm/job-positions/integration" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded shadow-sm transition">
            🚀 無料求人サイトへ自動連携
          </Link>
          <CreateJobDraftButton />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {jobs.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <p className="mb-4 text-lg">まだ求人票がありません。</p>
            <p className="text-sm border inline-block px-4 py-2 rounded bg-gray-50">右上の「新規求人を作成」から下書きを作成してください。</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">タイトル</th>
                <th className="px-6 py-3">雇用形態</th>
                <th className="px-6 py-3">地域</th>
                <th className="px-6 py-3">ステータス</th>
                <th className="px-6 py-3">更新日</th>
                <th className="px-6 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {job.title || <span className="text-gray-400 italic">未入力（下書き）</span>}
                  </td>
                  <td className="px-6 py-4">
                    {job.employment_type || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {job.address_region || '-'} {job.address_locality || ''}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      job.status === 'published' ? 'bg-green-100 text-green-800' :
                      job.status === 'closed' ? 'bg-gray-200 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {job.status === 'draft' ? '下書き' :
                       job.status === 'published' ? '公開中' :
                       job.status === 'closed' ? 'クローズ' : job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {formatDateTimeInJST(job.updated_at)}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-3">
                    <Link href={`/adm/job-positions/${job.id}`} className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                      編集・AI生成
                    </Link>
                    <span className="text-gray-300">|</span>
                    <DeleteJobButton jobId={job.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
