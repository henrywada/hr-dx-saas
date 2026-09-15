import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { BUCKET } from '@/lib/documents/storagePaths'
import { getDocumentPlugin } from '@/features/documents/plugins/registry'
import {
  asExtracted,
  parseAmountYen,
  type DocumentDetail,
  type DocumentListItem,
  type DocumentListScope,
  type ListDocumentsResult,
} from './types'
import { canMutateDocument } from './canMutateDocument'

const SIGNED_URL_EXPIRES_IN_SECONDS = 3600
const LIST_LIMIT = 50

type ListDocumentRow = {
  id: string
  owner_user_id: string
  document_type: string
  document_mode: string | null
  company_visible: boolean
  title: string
  counterparty: string
  context_date: string | null
  amount_yen: number | string | null
  notes: string
  tags: string[]
  extracted: unknown
  created_at: string
  updated_at: string
}

function parseSearch(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/[,%*()]/g, ' ')
    .replace(/\s+/g, ' ')
}

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS)
  if (error) {
    console.error('[documents] signed URL failed', error)
    return null
  }
  return data?.signedUrl ?? null
}

function rowToListItem(row: ListDocumentRow, frontImageUrl: string | null): DocumentListItem {
  return {
    id: row.id,
    documentType: row.document_type,
    documentMode: row.document_mode,
    ownerUserId: row.owner_user_id,
    companyVisible: row.company_visible,
    title: row.title,
    counterparty: row.counterparty,
    contextDate: row.context_date,
    amountYen: parseAmountYen(row.amount_yen),
    notes: row.notes ?? '',
    tags: row.tags ?? [],
    extracted: asExtracted(row.extracted),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    frontImageUrl,
  }
}

/** 文書一覧（ページング・スコープ・検索） */
export async function listDocuments(params: {
  type: string
  mode?: string | null
  scope: DocumentListScope
  offset?: number
  q?: string
}): Promise<ListDocumentsResult> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.id || !user.tenant_id) {
    return { documents: [], hasMore: false, nextOffset: null }
  }

  const plugin = getDocumentPlugin(params.type)
  if (!plugin) {
    return { documents: [], hasMore: false, nextOffset: null }
  }

  if (plugin.modes && plugin.modes.length > 0) {
    if (!params.mode || !plugin.modes.some(m => m.id === params.mode)) {
      return { documents: [], hasMore: false, nextOffset: null }
    }
  }

  if (params.scope === 'team' && !user.is_manager) {
    return { documents: [], hasMore: false, nextOffset: null }
  }

  if (params.scope === 'company' && params.type !== 'business_card') {
    return { documents: [], hasMore: false, nextOffset: null }
  }

  const offset = Math.max(0, params.offset ?? 0)
  const q = parseSearch(params.q)

  let query = supabase
    .from('captured_documents')
    .select(
      'id, owner_user_id, document_type, document_mode, company_visible, title, counterparty, context_date, amount_yen, notes, tags, extracted, created_at, updated_at'
    )
    .eq('tenant_id', user.tenant_id)
    .eq('document_type', plugin.id)

  if (params.mode) {
    query = query.eq('document_mode', params.mode)
  }

  if (params.scope === 'own') {
    query = query.eq('owner_user_id', user.id)
  } else if (params.scope === 'team') {
    // RLS が同部門マネージャーに絞る。本人は除外して「部門」タブ相当にする。
    query = query.neq('owner_user_id', user.id)
  } else if (params.scope === 'company') {
    query = query.eq('company_visible', true)
  }

  if (q) {
    query = query.or(
      `title.ilike.*${q}*,counterparty.ilike.*${q}*,extracted->>email.ilike.*${q}*,extracted->>recipient_name.ilike.*${q}*,extracted->>issuer_name.ilike.*${q}*`
    )
  }

  const { data, error } = await query
    .order('context_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + LIST_LIMIT)

  if (error) {
    console.error('[documents] listDocuments failed', error)
    return { documents: [], hasMore: false, nextOffset: null }
  }

  const rows = (data ?? []) as ListDocumentRow[]
  const hasMore = rows.length > LIST_LIMIT
  const pageRows = hasMore ? rows.slice(0, LIST_LIMIT) : rows
  const ids = pageRows.map(row => row.id)
  const frontImages = new Map<string, string>()

  if (ids.length > 0) {
    const thumbnailRole = plugin.imagePolicy.allowedRoles.includes('page') ? 'page' : 'front'
    const { data: images, error: imageError } = await supabase
      .from('captured_document_images')
      .select('document_id, storage_path, sort_order')
      .in('document_id', ids)
      .eq('role', thumbnailRole)
      .order('sort_order', { ascending: true })

    if (imageError) {
      console.error('[documents] list thumbnail fetch failed', imageError)
      return { documents: [], hasMore: false, nextOffset: null }
    }

    for (const image of images ?? []) {
      if (!frontImages.has(image.document_id)) {
        frontImages.set(image.document_id, image.storage_path)
      }
    }
  }

  const documents = await Promise.all(
    pageRows.map(async row =>
      rowToListItem(
        row,
        frontImages.has(row.id) ? await signedUrl(supabase, frontImages.get(row.id)!) : null
      )
    )
  )

  return {
    documents,
    hasMore,
    nextOffset: hasMore ? offset + LIST_LIMIT : null,
  }
}

/** 文書詳細（画像署名URL・明細付き） */
export async function getDocumentDetail(id: string): Promise<DocumentDetail | null> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.id) return null

  const { data: row, error } = await supabase
    .from('captured_documents')
    .select(
      'id, owner_user_id, document_type, document_mode, company_visible, title, counterparty, context_date, amount_yen, notes, tags, extracted, raw_ocr, created_at, updated_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !row) {
    if (error) console.error('[documents] getDocumentDetail failed', error)
    return null
  }

  const docRow = row as ListDocumentRow & { raw_ocr: string }

  const { data: images, error: imageError } = await supabase
    .from('captured_document_images')
    .select('id, role, sort_order, storage_path')
    .eq('document_id', id)
    .order('sort_order', { ascending: true })

  if (imageError) {
    console.error('[documents] detail images fetch failed', imageError)
    return null
  }

  const { data: lineItems, error: lineItemsError } = await supabase
    .from('captured_document_line_items')
    .select(
      'id, line_no, transaction_date, description, quantity, unit, unit_price, amount, tax_rate'
    )
    .eq('document_id', id)
    .order('line_no', { ascending: true })

  if (lineItemsError) {
    console.error('[documents] detail line items fetch failed', lineItemsError)
    return null
  }

  const imageDetails = await Promise.all(
    (images ?? []).map(async image => ({
      id: image.id,
      role: image.role,
      sortOrder: image.sort_order,
      storagePath: image.storage_path,
      url: await signedUrl(supabase, image.storage_path),
    }))
  )

  const thumbnailPath =
    imageDetails.find(img => img.role === 'page')?.storagePath ??
    imageDetails.find(img => img.role === 'front')?.storagePath ??
    null

  const base = rowToListItem(
    docRow,
    thumbnailPath ? await signedUrl(supabase, thumbnailPath) : null
  )

  return {
    ...base,
    rawOcr: docRow.raw_ocr ?? '',
    canMutate: canMutateDocument({
      actorUserId: user.id,
      ownerUserId: docRow.owner_user_id,
    }),
    images: imageDetails,
    lineItems: (lineItems ?? []).map(item => ({
      id: item.id,
      lineNo: item.line_no,
      transactionDate: item.transaction_date,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unit_price,
      amount: item.amount,
      taxRate: item.tax_rate,
    })),
  }
}
