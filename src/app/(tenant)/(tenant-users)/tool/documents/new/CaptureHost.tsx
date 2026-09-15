'use client'

// 文書種別ごとに Capture フォームを振り分ける Client ホスト
import { CaptureDocumentForm } from '@/features/documents/components/CaptureDocumentForm'
import { InvoiceCaptureForm } from '@/features/documents/components/InvoiceCaptureForm'
import { PurchaseOrderCaptureForm } from '@/features/documents/components/PurchaseOrderCaptureForm'
import { ReceiptCaptureForm } from '@/features/documents/components/ReceiptCaptureForm'

const ALLOWED = ['business_card', 'invoice', 'purchase_order', 'receipt'] as const

type DocumentType = (typeof ALLOWED)[number]

interface CaptureHostProps {
  tenantId: string
  userId: string
  documentType: DocumentType
  defaultContextDate: string
}

export function CaptureHost({
  tenantId,
  userId,
  documentType,
  defaultContextDate,
}: CaptureHostProps) {
  if (documentType === 'business_card') {
    return (
      <CaptureDocumentForm
        tenantId={tenantId}
        userId={userId}
        defaultContextDate={defaultContextDate}
        documentType={documentType}
      />
    )
  }

  if (documentType === 'purchase_order') {
    return <PurchaseOrderCaptureForm tenantId={tenantId} userId={userId} />
  }

  if (documentType === 'receipt') {
    return <ReceiptCaptureForm tenantId={tenantId} userId={userId} />
  }

  return <InvoiceCaptureForm tenantId={tenantId} userId={userId} />
}
