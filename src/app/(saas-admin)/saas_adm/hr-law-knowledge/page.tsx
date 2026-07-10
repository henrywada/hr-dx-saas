import {
  listHrLawSources,
  listHrLawDocuments,
  countPendingCrawlQueue,
  listHrLawRefreshLogs,
  listHrLawTopicProposals,
} from '@/features/saas-law-knowledge/queries'
import { HrLawKnowledgeTabs } from '@/features/saas-law-knowledge/components/HrLawKnowledgeTabs'

export default async function HrLawKnowledgePage() {
  const [sources, proposals, documents, pendingQueue, logs] = await Promise.all([
    listHrLawSources(),
    listHrLawTopicProposals(),
    listHrLawDocuments(),
    countPendingCrawlQueue(),
    listHrLawRefreshLogs(),
  ])

  return (
    <HrLawKnowledgeTabs
      sources={sources}
      proposals={proposals}
      documents={documents}
      logs={logs}
      pendingQueue={pendingQueue}
    />
  )
}
