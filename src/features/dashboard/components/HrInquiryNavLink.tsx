import {
  tenantHasHrInquiryEmail,
  tenantHasReadyRagDocuments,
} from '@/features/inquiry-chat/queries'
import { HrInquiryModal } from './HrInquiryModal'

/** ダッシュボード上部の「人事へのお問合せ」— モーダルで AI チャットまたは人事へメール */
export async function HrInquiryNavLink() {
  const [aiChatEnabled, hrMailEnabled] = await Promise.all([
    tenantHasReadyRagDocuments(),
    tenantHasHrInquiryEmail(),
  ])
  return <HrInquiryModal aiChatEnabled={aiChatEnabled} hrMailEnabled={hrMailEnabled} />
}
