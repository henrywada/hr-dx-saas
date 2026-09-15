'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { cleanupTmp } from '@/lib/documents/cleanupTmp'
import { findDuplicate } from '@/lib/documents/findDuplicate'
import {
  buildInvoiceCsvRowsWithHeader,
  buildPurchaseOrderCsvRowsWithHeader,
  encodeCsvWithBom,
  type InvoiceCsvExportMode,
  type InvoiceExportDocument,
  type InvoiceExportLineItem,
} from '@/lib/documents/exportCsv'
import { lineItemDraftToDbRow } from '@/lib/documents/lineItems'
import type { LineItemDraft } from '@/lib/documents/pluginTypes'
import { BUCKET, finalObjectPath } from '@/lib/documents/storagePaths'
import { tokyoToday } from '@/lib/documents/tokyoDate'
import {
  type DocumentOcrImage,
  ocrDocument,
} from '@/lib/image-analysis/document-ocr/documentOcr'
import { resolveDocumentPlugin } from '@/features/documents/plugins/registry'
import { canMutateDocument } from './canMutateDocument'
import { parseAnalyzeBody, parseCommitBody, type ParsedCommitBody } from './parseBody'
import {
  applyCompanyVisiblePolicy,
  asExtracted,
  deleteDocumentSchema,
  exportDocumentsSchema,
  findExportAccessError,
  parseAmountYen,
  updateDocumentSchema,
  type AnalyzeDuplicatePayload,
  type AnalyzeResult,
  type DocumentActionResult,
  type DocumentDetail,
  type ListDocumentsResult,
} from './types'
import { getDocumentDetail, listDocuments } from './queries'

type DocumentRow = {
  id: string
  owner_user_id: string
  company_visible: boolean
  notes: string
  tags: string[]
  context_date: string | null
  extracted: Record<string, string>
  raw_ocr: string
  updated_at: string
}

type ImageRow = {
  id: string
  role: string
  sort_order: number
  storage_path: string
}

type LineItemRow = {
  document_id: string
  line_no: number
  transaction_date: string | null
  description: string
  quantity: string
  unit: string
  unit_price: number | null
  amount: number | null
  tax_rate: string
}

function revalidateDocumentsPaths() {
  revalidatePath(APP_ROUTES.TENANT.TOOL_DOCUMENTS)
  revalidatePath(APP_ROUTES.TENANT.TOOL_DOCUMENTS_NEW)
}

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) {
    console.error('[documents] signed URL failed', error)
    return null
  }
  return data?.signedUrl ?? null
}

async function downloadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
): Promise<DocumentOcrImage> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) {
    throw new Error('画像の読み込みに失敗しました')
  }
  return {
    imageBuffer: Buffer.from(await data.arrayBuffer()),
    mimeType: data.type || 'image/jpeg',
  }
}

async function removePaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[]
) {
  if (paths.length === 0) return
  const { data, error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) {
    console.error('[documents] storage remove failed', { error, paths })
    return
  }
  if ((data?.length ?? 0) < paths.length) {
    console.error('[documents] storage remove missed objects', {
      requested: paths,
      removed: data?.map(object => object.name) ?? [],
    })
  }
}

async function replaceLineItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  tenantId: string,
  drafts: LineItemDraft[]
) {
  await supabase.from('captured_document_line_items').delete().eq('document_id', documentId)
  if (drafts.length === 0) return
  const rows = drafts.map(d => lineItemDraftToDbRow(d, documentId, tenantId))
  const { error } = await supabase.from('captured_document_line_items').insert(rows)
  if (error) throw error
}

function rowKeys(plugin: ParsedCommitBody['plugin']) {
  return (row: DocumentRow) => plugin.duplicateKeys(row.extracted)
}

function buildReplacementImages({
  tenantId,
  documentId,
  documentType,
  contextDate,
  parsed,
}: {
  tenantId: string
  documentId: string
  documentType: string
  contextDate: string | null
  parsed: ParsedCommitBody
}) {
  const dateYmd = contextDate ?? tokyoToday()
  const imageRows: {
    document_id: string
    tenant_id: string
    sort_order: number
    role: string
    storage_path: string
  }[] = []
  const copyJobs: { tmpPath: string; destination: string }[] = []

  for (const [index, image] of parsed.images.entries()) {
    const destination = finalObjectPath(
      tenantId,
      documentType,
      dateYmd,
      documentId,
      randomUUID()
    )
    imageRows.push({
      document_id: documentId,
      tenant_id: tenantId,
      sort_order: index,
      role: image.role,
      storage_path: destination,
    })
    copyJobs.push({ tmpPath: image.tmpPath, destination })
  }

  return { imageRows, copyJobs }
}

async function deleteImageRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  paths: string[]
) {
  if (paths.length === 0) return
  const { error } = await supabase
    .from('captured_document_images')
    .delete()
    .eq('document_id', documentId)
    .in('storage_path', paths)
  if (error) throw new Error(error.message)
}

function toExportLineItem(row: LineItemRow): InvoiceExportLineItem {
  return {
    line_no: row.line_no,
    transaction_date: row.transaction_date,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    unit_price: row.unit_price,
    amount: row.amount,
    tax_rate: row.tax_rate,
  }
}

function toExportDocument(
  row: {
    id: string
    title: string
    counterparty: string
    context_date: string | null
    amount_yen: number | string | null
    notes: string
    tags: string[]
    extracted: unknown
  },
  lineItems: LineItemRow[]
): InvoiceExportDocument {
  return {
    id: row.id,
    title: row.title,
    counterparty: row.counterparty,
    contextDate: row.context_date,
    amountYen: parseAmountYen(row.amount_yen),
    notes: row.notes ?? '',
    tags: row.tags ?? [],
    extracted: asExtracted(row.extracted),
    lineItems: lineItems.map(toExportLineItem),
  }
}

/** tmp 画像パスを指定して OCR 解析（dx-sensor POST /api/documents/analyze 相当） */
export async function analyzeDocument(input: unknown): Promise<AnalyzeResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) {
    return { success: false, error: '認証エラー' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'OCR設定がありません' }
  }

  let parsed
  try {
    parsed = parseAnalyzeBody(input, { tenantId: user.tenant_id, userId: user.id })
  } catch {
    return { success: false, error: 'リクエストが不正です' }
  }

  const supabase = await createClient()
  await cleanupTmp(supabase, user.tenant_id, user.id)

  if (!parsed.plugin.structuredOcr) {
    const frontPath = parsed.images.find(image => image.role === 'front')?.path
    if (!frontPath) {
      return { success: false, error: 'リクエストが不正です' }
    }
  }

  let extracted: Record<string, string>
  let lineItems: LineItemDraft[] | undefined
  let rawOcr = ''
  let warning: 'ocr_failed' | undefined

  if (parsed.plugin.structuredOcr) {
    lineItems = []
  }

  try {
    const model = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash'

    if (parsed.plugin.structuredOcr) {
      const pages = await Promise.all(
        parsed.images.map(image => downloadImage(supabase, image.path))
      )
      const result = await ocrDocument({ pages, plugin: parsed.plugin, apiKey, model })
      extracted = result.extracted
      lineItems = result.lineItems ?? []
      rawOcr = result.rawText
    } else {
      const frontPath = parsed.images.find(image => image.role === 'front')!.path
      const backPath = parsed.images.find(image => image.role === 'back')?.path
      const result = await ocrDocument({
        front: await downloadImage(supabase, frontPath),
        back: backPath ? await downloadImage(supabase, backPath) : undefined,
        plugin: parsed.plugin,
        apiKey,
        model,
      })
      extracted = result.extracted
      rawOcr = result.rawText
    }
  } catch (err) {
    console.error('[documents] analyzeDocument OCR failed', err)
    extracted = parsed.plugin.parseExtracted({})
    warning = 'ocr_failed'
  }

  let dupQuery = supabase
    .from('captured_documents')
    .select(
      'id, owner_user_id, company_visible, notes, tags, context_date, extracted, updated_at'
    )
    .eq('tenant_id', user.tenant_id)
    .eq('document_type', parsed.documentType)
  if (parsed.documentMode !== null) {
    dupQuery = dupQuery.eq('document_mode', parsed.documentMode)
  }
  const { data: rows, error: rowsError } = await dupQuery.or(
    `owner_user_id.eq.${user.id},company_visible.eq.true`
  )

  if (rowsError) {
    console.error('[documents] analyzeDocument duplicate fetch failed', rowsError)
  }

  const visibleRows: DocumentRow[] = (rows ?? []).map(row => ({
    id: row.id,
    owner_user_id: row.owner_user_id,
    company_visible: row.company_visible,
    notes: row.notes ?? '',
    tags: row.tags ?? [],
    context_date: row.context_date,
    extracted: asExtracted(row.extracted),
    raw_ocr: '',
    updated_at: row.updated_at,
  }))

  const duplicate = findDuplicate(
    visibleRows,
    parsed.plugin.duplicateKeys(extracted),
    row => parsed.plugin.duplicateKeys(row.extracted),
    { updatedAt: row => row.updated_at }
  )

  let duplicatePayload: AnalyzeDuplicatePayload | null = null
  if (duplicate) {
    const { data: images } = await supabase
      .from('captured_document_images')
      .select('role, storage_path, sort_order')
      .eq('document_id', duplicate.id)
      .order('sort_order', { ascending: true })

    duplicatePayload = {
      id: duplicate.id,
      canMutate: canMutateDocument({
        actorUserId: user.id,
        ownerUserId: duplicate.owner_user_id,
      }),
      extracted: duplicate.extracted,
      notes: duplicate.notes,
      tags: duplicate.tags,
      contextDate: duplicate.context_date,
      companyVisible: duplicate.company_visible,
      images: await Promise.all(
        (images ?? []).map(async image => ({
          role: image.role,
          url: await signedUrl(supabase, image.storage_path),
        }))
      ),
    }
  }

  return {
    success: true,
    extracted,
    ...(lineItems !== undefined ? { lineItems } : {}),
    rawOcr,
    ...(warning ? { warning } : {}),
    duplicate: duplicatePayload,
  }
}

/** 文書確定（dx-sensor POST /api/documents 相当） */
export async function createDocument(input: unknown): Promise<DocumentActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) {
    return { success: false, error: '認証エラー' }
  }
  if (!user.division_id) {
    return { success: false, error: '所属部署が未設定です' }
  }

  let parsed: ParsedCommitBody
  try {
    parsed = parseCommitBody(input, { tenantId: user.tenant_id, userId: user.id })
  } catch {
    return { success: false, error: 'リクエストが不正です' }
  }

  const supabase = await createClient()
  const extracted = parsed.plugin.parseExtracted(parsed.extracted)

  let dupQuery = supabase
    .from('captured_documents')
    .select(
      'id, owner_user_id, company_visible, notes, tags, context_date, extracted, raw_ocr, updated_at'
    )
    .eq('tenant_id', user.tenant_id)
    .eq('document_type', parsed.documentType)
  if (parsed.documentMode !== null) {
    dupQuery = dupQuery.eq('document_mode', parsed.documentMode)
  }
  const { data: rows, error: rowsError } = await dupQuery.or(
    `owner_user_id.eq.${user.id},company_visible.eq.true`
  )

  if (rowsError) {
    console.error('[documents] createDocument duplicate fetch failed', rowsError)
    return { success: false, error: '文書の確認に失敗しました' }
  }

  const visibleRows: DocumentRow[] = (rows ?? []).map(row => ({
    id: row.id,
    owner_user_id: row.owner_user_id,
    company_visible: row.company_visible,
    notes: row.notes ?? '',
    tags: row.tags ?? [],
    context_date: row.context_date,
    extracted: asExtracted(row.extracted),
    raw_ocr: row.raw_ocr ?? '',
    updated_at: row.updated_at,
  }))

  let target = parsed.existingId
    ? (visibleRows.find(row => row.id === parsed.existingId) ?? null)
    : null
  if (parsed.existingId && !target) {
    return { success: false, error: '文書が見つかりません' }
  }

  if (
    target &&
    !canMutateDocument({ actorUserId: user.id, ownerUserId: target.owner_user_id })
  ) {
    return { success: false, error: '文書を更新する権限がありません' }
  }

  const duplicate = findDuplicate(
    visibleRows,
    parsed.plugin.duplicateKeys(extracted),
    rowKeys(parsed.plugin),
    {
      exclude: row => row.id === parsed.existingId,
      updatedAt: row => row.updated_at,
    }
  )

  if (duplicate) {
    const canMutateDuplicate = canMutateDocument({
      actorUserId: user.id,
      ownerUserId: duplicate.owner_user_id,
    })
    if (!canMutateDuplicate) {
      return { success: false, error: '編集権限のない重複文書があります' }
    }
    target = duplicate
  }

  let documentId = target?.id ?? null
  let inserted = false
  const oldImages: ImageRow[] = []

  const nextNotes = target && !parsed.notesProvided ? target.notes : parsed.notes
  const nextTags = target && !parsed.tagsProvided ? (target.tags ?? []) : parsed.tags
  const nextContextDate =
    target && !parsed.contextDateProvided ? target.context_date : parsed.contextDate
  const rawCompanyVisible =
    target && !parsed.companyVisibleProvided ? target.company_visible : parsed.companyVisible
  const nextCompanyVisible = applyCompanyVisiblePolicy(parsed.documentType, rawCompanyVisible)
  const nextRawOcr = target && !parsed.rawOcrProvided ? (target.raw_ocr ?? '') : parsed.rawOcr
  const nextIndexed = parsed.plugin.toIndexedFields(extracted, {
    notes: nextNotes,
    tags: nextTags,
    contextDate: nextContextDate,
  })

  const values = {
    company_visible: nextCompanyVisible,
    title: nextIndexed.title,
    counterparty: nextIndexed.counterparty,
    context_date: nextIndexed.context_date,
    amount_yen: nextIndexed.amount_yen,
    notes: nextNotes,
    tags: nextTags,
    extracted,
    raw_ocr: nextRawOcr,
    updated_at: new Date().toISOString(),
  }

  if (documentId) {
    const { data: existingImages, error: imageReadError } = await supabase
      .from('captured_document_images')
      .select('id, role, sort_order, storage_path')
      .eq('document_id', documentId)
    if (imageReadError) {
      console.error('[documents] createDocument image fetch failed', imageReadError)
      return { success: false, error: '文書画像の確認に失敗しました' }
    }
    oldImages.push(...((existingImages ?? []) as ImageRow[]))
  } else {
    const { data: insertedRow, error } = await supabase
      .from('captured_documents')
      .insert({
        ...values,
        tenant_id: user.tenant_id,
        owner_user_id: user.id,
        division_id: user.division_id,
        document_type: parsed.documentType,
        document_mode: parsed.documentMode,
      })
      .select('id')
      .maybeSingle()
    if (error || !insertedRow) {
      console.error('[documents] createDocument insert failed', error)
      return { success: false, error: '文書の保存に失敗しました' }
    }
    documentId = insertedRow.id
    inserted = true
  }

  if (!documentId) {
    return { success: false, error: '文書の保存に失敗しました' }
  }
  const savedDocumentId = documentId

  let copiedPaths: string[] = []
  let newImageRowsInserted = false
  let newImageRowPaths: string[] = []

  try {
    const replacement = buildReplacementImages({
      tenantId: user.tenant_id,
      documentId: savedDocumentId,
      documentType: parsed.documentType,
      contextDate: nextContextDate,
      parsed,
    })
    newImageRowPaths = replacement.imageRows.map(image => image.storage_path)

    const { error: imageInsertError } = await supabase
      .from('captured_document_images')
      .insert(replacement.imageRows)
    if (imageInsertError) {
      throw new Error(imageInsertError.message)
    }
    newImageRowsInserted = true

    for (const job of replacement.copyJobs) {
      const { error } = await supabase.storage.from(BUCKET).copy(job.tmpPath, job.destination)
      if (error) throw new Error(error.message)
      copiedPaths.push(job.destination)
    }

    if (!inserted) {
      const { error } = await supabase
        .from('captured_documents')
        .update(values)
        .eq('id', savedDocumentId)
        .eq('tenant_id', user.tenant_id)
        .eq('owner_user_id', user.id)
      if (error) throw new Error(error.message)
    }

    if (parsed.plugin.supportsLineItems) {
      await replaceLineItems(supabase, savedDocumentId, user.tenant_id, parsed.lineItems)
    }
  } catch (err) {
    console.error('[documents] createDocument image replace failed', err)
    await removePaths(supabase, copiedPaths)
    if (newImageRowsInserted) {
      try {
        await deleteImageRows(supabase, savedDocumentId, newImageRowPaths)
      } catch (deleteErr) {
        console.error('[documents] createDocument new image cleanup failed', deleteErr)
      }
    }
    if (inserted) {
      await supabase.from('captured_documents').delete().eq('id', savedDocumentId)
    }
    return { success: false, error: '文書画像の保存に失敗しました' }
  }

  if (!inserted && oldImages.length > 0) {
    const oldPaths = oldImages.map(image => image.storage_path)
    await removePaths(supabase, oldPaths)
    try {
      await deleteImageRows(supabase, savedDocumentId, oldPaths)
    } catch (err) {
      console.error('[documents] createDocument old image cleanup failed', err)
    }
  }

  await removePaths(
    supabase,
    parsed.images.map(image => image.tmpPath)
  )

  revalidateDocumentsPaths()
  return { success: true, id: savedDocumentId, updated: !inserted }
}

/** 文書メタデータ更新（dx-sensor PATCH /api/documents/[id] 相当） */
export async function updateDocument(input: unknown): Promise<DocumentActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) {
    return { success: false, error: '認証エラー' }
  }

  const parsed = updateDocumentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です' }
  }

  const supabase = await createClient()
  const { data: row, error: fetchError } = await supabase
    .from('captured_documents')
    .select(
      'id, owner_user_id, document_type, document_mode, company_visible, title, counterparty, context_date, amount_yen, notes, tags, extracted, raw_ocr, created_at, updated_at'
    )
    .eq('id', parsed.data.id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: '文書が見つかりません' }
  }

  if (!canMutateDocument({ actorUserId: user.id, ownerUserId: row.owner_user_id })) {
    return { success: false, error: '文書を更新する権限がありません' }
  }

  const resolved = resolveDocumentPlugin(row.document_type, row.document_mode)
  if (!resolved) {
    return { success: false, error: '文書種別が不正です' }
  }
  const plugin = resolved.plugin

  let patchLineItems: LineItemDraft[] | null = null
  if (plugin.supportsLineItems && parsed.data.lineItems !== undefined) {
    if (!plugin.parseLineItems) {
      return { success: false, error: 'リクエストが不正です' }
    }
    try {
      patchLineItems = plugin.parseLineItems(parsed.data.lineItems)
    } catch {
      return { success: false, error: 'リクエストが不正です' }
    }
  }

  const nextExtracted = parsed.data.extracted
    ? plugin.parseExtracted(parsed.data.extracted)
    : plugin.parseExtracted(asExtracted(row.extracted))
  const nextNotes = parsed.data.notes ?? row.notes
  const nextTags = parsed.data.tags ?? row.tags ?? []
  const nextContextDate =
    parsed.data.contextDate !== undefined ? parsed.data.contextDate : row.context_date
  const nextCompanyVisible = applyCompanyVisiblePolicy(
    row.document_type,
    parsed.data.companyVisible !== undefined ? parsed.data.companyVisible : row.company_visible
  )

  if (!row.company_visible && nextCompanyVisible) {
    let dupQuery = supabase
      .from('captured_documents')
      .select('id, owner_user_id, company_visible, extracted, updated_at')
      .eq('tenant_id', user.tenant_id)
      .eq('document_type', plugin.id)
    if (row.document_mode !== null) {
      dupQuery = dupQuery.eq('document_mode', row.document_mode)
    }
    const { data: dupRows, error: dupError } = await dupQuery.or(
      `owner_user_id.eq.${user.id},company_visible.eq.true`
    )

    if (dupError) {
      console.error('[documents] updateDocument duplicate fetch failed', dupError)
      return { success: false, error: '文書の確認に失敗しました' }
    }

    const duplicate = findDuplicate(
      (dupRows ?? []).map(dupRow => ({
        id: dupRow.id,
        owner_user_id: dupRow.owner_user_id,
        company_visible: dupRow.company_visible,
        extracted: asExtracted(dupRow.extracted),
        updated_at: dupRow.updated_at,
      })),
      plugin.duplicateKeys(nextExtracted),
      dup => plugin.duplicateKeys(dup.extracted),
      {
        exclude: dup => dup.id === row.id,
        include: dup => dup.company_visible,
        updatedAt: dup => dup.updated_at,
      }
    )

    if (duplicate) {
      return { success: false, error: '会社公開済みの重複文書があります' }
    }
  }

  const indexed = plugin.toIndexedFields(nextExtracted, {
    notes: nextNotes,
    tags: nextTags,
    contextDate: nextContextDate,
  })

  const { data: updated, error } = await supabase
    .from('captured_documents')
    .update({
      company_visible: nextCompanyVisible,
      title: indexed.title,
      counterparty: indexed.counterparty,
      context_date: indexed.context_date,
      amount_yen: indexed.amount_yen,
      notes: nextNotes,
      tags: nextTags,
      extracted: nextExtracted,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('tenant_id', user.tenant_id)
    .eq('owner_user_id', user.id)
    .select('id')
    .maybeSingle()

  if (error || !updated) {
    console.error('[documents] updateDocument failed', error)
    return { success: false, error: '文書の更新に失敗しました' }
  }

  if (patchLineItems !== null) {
    try {
      await replaceLineItems(supabase, row.id, user.tenant_id, patchLineItems)
    } catch (err) {
      console.error('[documents] updateDocument line items failed', err)
      return { success: false, error: '明細の保存に失敗しました' }
    }
  }

  revalidateDocumentsPaths()
  return { success: true, id: row.id, updated: true }
}

/** 文書削除 */
export async function deleteDocument(input: unknown): Promise<DocumentActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) {
    return { success: false, error: '認証エラー' }
  }

  const parsed = deleteDocumentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: '不正なIDです' }
  }

  const supabase = await createClient()
  const { data: row, error: fetchError } = await supabase
    .from('captured_documents')
    .select('id, owner_user_id')
    .eq('id', parsed.data.id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (fetchError || !row) {
    return { success: false, error: '文書が見つかりません' }
  }

  if (!canMutateDocument({ actorUserId: user.id, ownerUserId: row.owner_user_id })) {
    return { success: false, error: '文書を削除する権限がありません' }
  }

  const { data: images, error: imageError } = await supabase
    .from('captured_document_images')
    .select('storage_path')
    .eq('document_id', parsed.data.id)

  if (imageError) {
    console.error('[documents] deleteDocument image fetch failed', imageError)
    return { success: false, error: '文書画像の確認に失敗しました' }
  }

  const paths = (images ?? []).map(image => image.storage_path)

  const { error: deleteError } = await supabase
    .from('captured_documents')
    .delete()
    .eq('id', parsed.data.id)
    .eq('tenant_id', user.tenant_id)
    .eq('owner_user_id', user.id)

  if (deleteError) {
    console.error('[documents] deleteDocument failed', deleteError)
    return { success: false, error: '文書の削除に失敗しました' }
  }

  await removePaths(supabase, paths)
  revalidateDocumentsPaths()
  return { success: true, id: parsed.data.id }
}

/** 既存画像で再解析（dx-sensor POST /api/documents/[id]/analyze 相当） */
export async function reanalyzeDocument(id: string): Promise<AnalyzeResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) {
    return { success: false, error: '認証エラー' }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'OCR設定がありません' }
  }

  const supabase = await createClient()
  const { data: document, error: documentError } = await supabase
    .from('captured_documents')
    .select('id, owner_user_id, document_type, document_mode, company_visible')
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (documentError) {
    console.error('[documents] reanalyzeDocument fetch failed', documentError)
    return { success: false, error: '文書の取得に失敗しました' }
  }
  if (!document) {
    return { success: false, error: '文書が見つかりません' }
  }

  if (!canMutateDocument({ actorUserId: user.id, ownerUserId: document.owner_user_id })) {
    return { success: false, error: '文書を更新する権限がありません' }
  }

  const resolved = resolveDocumentPlugin(document.document_type, document.document_mode)
  if (!resolved) {
    return { success: false, error: '文書種別が不正です' }
  }
  const plugin = resolved.plugin

  const { data: images, error: imageError } = await supabase
    .from('captured_document_images')
    .select('role, sort_order, storage_path')
    .eq('document_id', document.id)
    .order('sort_order', { ascending: true })

  if (imageError) {
    console.error('[documents] reanalyzeDocument images failed', imageError)
    return { success: false, error: '文書画像の取得に失敗しました' }
  }

  const imageRows = images ?? []

  if (!plugin.structuredOcr) {
    const frontPath = imageRows.find(image => image.role === 'front')?.storage_path
    if (!frontPath) {
      return { success: false, error: '文書画像が見つかりません' }
    }
  } else if (imageRows.filter(image => image.role === 'page').length === 0) {
    return { success: false, error: '文書画像が見つかりません' }
  }

  let extracted: Record<string, string>
  let lineItems: LineItemDraft[] | undefined
  let rawOcr = ''
  let warning: 'ocr_failed' | undefined

  if (plugin.structuredOcr) {
    lineItems = []
  }

  try {
    const model = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash'

    if (plugin.structuredOcr) {
      const pageRows = imageRows.filter(image => image.role === 'page')
      const pages = await Promise.all(
        pageRows.map(image => downloadImage(supabase, image.storage_path))
      )
      const result = await ocrDocument({ pages, plugin, apiKey, model })
      extracted = result.extracted
      lineItems = result.lineItems ?? []
      rawOcr = result.rawText
    } else {
      const frontPath = imageRows.find(image => image.role === 'front')!.storage_path
      const backPath = imageRows.find(image => image.role === 'back')?.storage_path
      const result = await ocrDocument({
        front: await downloadImage(supabase, frontPath),
        back: backPath ? await downloadImage(supabase, backPath) : undefined,
        plugin,
        apiKey,
        model,
      })
      extracted = result.extracted
      rawOcr = result.rawText
    }
  } catch (err) {
    console.error('[documents] reanalyzeDocument OCR failed', err)
    extracted = plugin.parseExtracted({})
    warning = 'ocr_failed'
  }

  return {
    success: true,
    extracted,
    ...(lineItems !== undefined ? { lineItems } : {}),
    rawOcr,
    ...(warning ? { warning } : {}),
    duplicate: null,
  }
}

/** CSV エクスポート（invoice / purchase_order のみ） */
export async function exportDocumentsCsv(
  input: unknown
): Promise<{ csv: string } | { error: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { error: '認証エラー' }
  }

  const parsed = exportDocumentsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'リクエストが不正です' }
  }

  const exportMode: InvoiceCsvExportMode = parsed.data.exportMode ?? 'summary'
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('captured_documents')
    .select('id, title, counterparty, context_date, amount_yen, notes, tags, extracted')
    .eq('tenant_id', user.tenant_id)
    .eq('document_type', parsed.data.documentType)
    .in('id', parsed.data.documentIds)

  if (error) {
    console.error('[documents] exportDocumentsCsv fetch failed', error)
    return { error: '文書の取得に失敗しました' }
  }

  const readableRows = data ?? []
  const exportAccessError = findExportAccessError(parsed.data.documentIds, readableRows.length)
  if (exportAccessError) {
    return { error: exportAccessError }
  }

  const readableIds = readableRows.map(row => row.id)
  const { data: lineItemRows, error: lineItemsError } = await supabase
    .from('captured_document_line_items')
    .select(
      'document_id, line_no, transaction_date, description, quantity, unit, unit_price, amount, tax_rate'
    )
    .in('document_id', readableIds)
    .order('line_no', { ascending: true })

  if (lineItemsError) {
    console.error('[documents] exportDocumentsCsv line items failed', lineItemsError)
    return { error: '明細の取得に失敗しました' }
  }

  const lineItemsByDocument = new Map<string, LineItemRow[]>()
  for (const item of (lineItemRows ?? []) as LineItemRow[]) {
    const existing = lineItemsByDocument.get(item.document_id) ?? []
    existing.push(item)
    lineItemsByDocument.set(item.document_id, existing)
  }

  const rowById = new Map(readableRows.map(row => [row.id, row]))
  const orderedRows = parsed.data.documentIds
    .map(docId => rowById.get(docId))
    .filter((row): row is NonNullable<typeof row> => row !== undefined)

  const documents = orderedRows.map(row =>
    toExportDocument(row, lineItemsByDocument.get(row.id) ?? [])
  )

  const csvRows =
    parsed.data.documentType === 'purchase_order'
      ? buildPurchaseOrderCsvRowsWithHeader(documents, exportMode)
      : buildInvoiceCsvRowsWithHeader(documents, exportMode)

  const bodyBuffer = encodeCsvWithBom(csvRows)
  return { csv: bodyBuffer.toString('utf-8') }
}


/** Client から listDocuments を呼ぶラッパー */
export async function fetchDocumentsList(
  params: Parameters<typeof listDocuments>[0]
): Promise<ListDocumentsResult> {
  return listDocuments(params)
}

/** Client から getDocumentDetail を呼ぶラッパー */
export async function fetchDocumentDetail(id: string): Promise<DocumentDetail | null> {
  return getDocumentDetail(id)
}
