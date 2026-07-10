import {
  listHrLawSources,
  listHrLawDocuments,
  countPendingCrawlQueue,
} from '@/features/saas-law-knowledge/queries'
import { LawSourceList } from '@/features/saas-law-knowledge/components/LawSourceList'
import { LawDocumentTable } from '@/features/saas-law-knowledge/components/LawDocumentTable'

export default async function HrLawKnowledgePage() {
  const [sources, documents, pendingQueue] = await Promise.all([
    listHrLawSources(),
    listHrLawDocuments(),
    countPendingCrawlQueue(),
  ])

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-300 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold">人事アップデート管理</h1>
          <p className="text-xs text-[#57606a] mt-1">
            厚労省等の公的情報を週次収集し、全テナントで共有します（OpenRouter）。
          </p>
        </div>
        <p className="text-xs text-[#57606a] shrink-0">
          キュー未処理: <span className="font-semibold text-[#24292f]">{pendingQueue}</span> 件
        </p>
      </div>
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-[#57606a]">監視トピック</h2>
        <LawSourceList sources={sources} />
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-[#57606a]">収集済み文書</h2>
        <LawDocumentTable documents={documents} />
      </section>
    </div>
  )
}
