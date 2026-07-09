import { listHrLawSources, listHrLawDocuments } from '@/features/saas-law-knowledge/queries'
import { LawSourceList } from '@/features/saas-law-knowledge/components/LawSourceList'
import { LawDocumentTable } from '@/features/saas-law-knowledge/components/LawDocumentTable'

export default async function HrLawKnowledgePage() {
  const [sources, documents] = await Promise.all([listHrLawSources(), listHrLawDocuments()])

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-300 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold">法令ナレッジ自動更新管理</h1>
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
