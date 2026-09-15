'use client'

// 文書種別ごとに Album コンポーネントを振り分ける Client ホスト
import type { DocumentListItem } from '@/features/documents/types'
import { DocumentsAlbum } from '@/features/documents/components/DocumentsAlbum'
import { InvoiceAlbum } from '@/features/documents/components/InvoiceAlbum'
import { PurchaseOrderAlbum } from '@/features/documents/components/PurchaseOrderAlbum'
import { ReceiptAlbum } from '@/features/documents/components/ReceiptAlbum'

const ALLOWED = ['business_card', 'invoice', 'purchase_order', 'receipt'] as const
type DocumentType = (typeof ALLOWED)[number]
type ReceiptMode = 'expense' | 'qualified_invoice'

interface DocumentsAlbumHostProps {
  userId: string
  isManager: boolean
  documentType: DocumentType
  initialOpenId: string | null
  initialMode: ReceiptMode
  initialDocuments: DocumentListItem[]
  initialHasMore: boolean
  initialNextOffset: number | null
}

export function DocumentsAlbumHost({
  userId,
  isManager,
  documentType,
  initialOpenId,
  initialMode,
  initialDocuments,
  initialHasMore,
  initialNextOffset,
}: DocumentsAlbumHostProps) {
  const shared = {
    userId,
    isManager,
    initialOpenId,
    initialDocuments,
    initialHasMore,
    initialNextOffset,
  }

  if (documentType === 'business_card') {
    return <DocumentsAlbum documentType="business_card" {...shared} />
  }
  if (documentType === 'invoice') {
    return <InvoiceAlbum documentType="invoice" {...shared} />
  }
  if (documentType === 'purchase_order') {
    return <PurchaseOrderAlbum documentType="purchase_order" {...shared} />
  }
  return (
    <ReceiptAlbum
      documentType="receipt"
      initialMode={initialMode}
      {...shared}
    />
  )
}
