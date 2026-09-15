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

export interface ResolvedDocumentPlugin {
  plugin: DocumentTypePlugin
  documentMode: string | null
}

/** 区分（mode）付き種別（領収書等）のプラグイン解決 */
export function resolveDocumentPlugin(
  documentType: string,
  modeId: string | null
): ResolvedDocumentPlugin | null {
  const base = getDocumentPlugin(documentType)
  if (!base) {
    return null
  }

  if (!base.modes || base.modes.length === 0) {
    return { plugin: base, documentMode: null }
  }

  const mode = base.modes.find(m => m.id === modeId)
  if (!mode) {
    return null
  }

  return {
    plugin: {
      ...base,
      analyzePrompt: mode.analyzePrompt,
      parseExtracted: mode.parseExtracted,
      toIndexedFields: mode.toIndexedFields,
      duplicateKeys: mode.duplicateKeys,
    },
    documentMode: mode.id,
  }
}
