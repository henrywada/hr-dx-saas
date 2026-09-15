// 文書ホルダー一覧 — Server Component
import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { listDocuments } from '@/features/documents/queries'
import { APP_ROUTES } from '@/config/routes'
import { DocumentsAlbumHost } from './DocumentsAlbumHost'

const ALLOWED = ['business_card', 'invoice', 'purchase_order', 'receipt'] as const
type DocumentType = (typeof ALLOWED)[number]

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; open?: string; mode?: string }>
}) {
  const { type, open, mode } = await searchParams
  const documentType = (type ?? 'business_card') as DocumentType
  if (!ALLOWED.includes(documentType)) notFound()

  const user = await getServerUser()
  if (!user?.id) redirect(APP_ROUTES.AUTH.LOGIN)
  if (!user.tenant_id) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm text-gray-600">
        所属テナントが見つかりません。管理者にお問い合わせください。
      </div>
    )
  }

  const receiptMode =
    documentType === 'receipt'
      ? mode === 'qualified_invoice'
        ? 'qualified_invoice'
        : 'expense'
      : undefined

  const initialList = await listDocuments({
    type: documentType,
    mode: receiptMode,
    scope: 'own',
    offset: 0,
  })

  return (
    <DocumentsAlbumHost
      userId={user.id}
      isManager={Boolean(user.is_manager)}
      documentType={documentType}
      initialOpenId={open ?? null}
      initialMode={receiptMode === 'qualified_invoice' ? 'qualified_invoice' : 'expense'}
      initialDocuments={initialList.documents}
      initialHasMore={initialList.hasMore}
      initialNextOffset={initialList.nextOffset}
    />
  )
}
