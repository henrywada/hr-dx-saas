import {
  tenantHasHrInquiryEmail,
  hasPublishedLawDocuments,
} from '@/features/inquiry-chat/queries'
import { HrInquiryModal } from './HrInquiryModal'

/** ダッシュボード上部の「人事へのお問合せ」— モーダルで法令情報（公的）検索または人事へメール */
export async function HrInquiryNavLink() {
  const [aiChatEnabled, hrMailEnabled] = await Promise.all([
    hasPublishedLawDocuments(),
    tenantHasHrInquiryEmail(),
  ])
  return <HrInquiryModal aiChatEnabled={aiChatEnabled} hrMailEnabled={hrMailEnabled} />
}
