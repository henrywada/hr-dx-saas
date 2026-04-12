import { tenantHasReadyRagDocuments } from '@/features/inquiry-chat/queries'
import { HrInquiryModal } from './HrInquiryModal'

/** ダッシュボード上部の「人事へのお問合せ」— モーダルで AI チャットまたは人事へメール */
export async function HrInquiryNavLink() {
  const aiChatEnabled = await tenantHasReadyRagDocuments()
  return <HrInquiryModal aiChatEnabled={aiChatEnabled} />
}
