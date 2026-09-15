import type { DocumentTypePlugin } from '@/lib/documents/pluginTypes'

import { businessCardPlugin } from '@/features/documents/plugins/business_card/plugin'
import { invoicePlugin } from '@/features/documents/plugins/invoice/plugin'
import { purchaseOrderPlugin } from '@/features/documents/plugins/purchase_order/plugin'
import { receiptPlugin } from '@/features/documents/plugins/receipt/plugin'

const plugins: Record<string, DocumentTypePlugin> = {
  business_card: businessCardPlugin,
  invoice: invoicePlugin,
  purchase_order: purchaseOrderPlugin,
  receipt: receiptPlugin,
}

export function getDocumentPlugin(id: string): DocumentTypePlugin | null {
  return plugins[id] ?? null
}
