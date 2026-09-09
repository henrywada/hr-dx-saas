'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import type { ProductManual, ProductManualType } from './types'
import { PRODUCT_MANUAL_LABELS } from './types'
import {
  MYOU_PRODUCT_MANUALS_BUCKET,
  MYOU_PRODUCT_MANUAL_ALLOWED_MIME,
  MYOU_PRODUCT_MANUAL_MAX_BYTES,
  MYOU_PRODUCT_MANUAL_MAX_MB,
  buildProductManualStoragePath,
  getProductManualLabel,
} from './product-manuals-constants'

export type UploadProductManualResult =
  | { success: true; manual: ProductManual }
  | { success: false; error: string }

function extFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName
  switch (file.type) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    default:
      return 'png'
  }
}

/**
 * 取扱説明書画像をアップロードし、選択ラベル名で Storage / DB に保存する。
 * Git や public/ には保存しない（ローカル検証画像が本番へ同期されない）。
 */
export async function uploadProductManual(formData: FormData): Promise<UploadProductManualResult> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'ログインが必要です。' }
  }

  const manualTypeRaw = String(formData.get('manualType') ?? '')
  if (manualTypeRaw !== 'aircon' && manualTypeRaw !== 'bathroom') {
    return { success: false, error: '取扱説明書の種別を選択してください。' }
  }
  const manualType = manualTypeRaw as ProductManualType
  const label = getProductManualLabel(manualType)

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: '画像ファイルを選択してください。' }
  }

  const allowed = MYOU_PRODUCT_MANUAL_ALLOWED_MIME as readonly string[]
  if (!allowed.includes(file.type)) {
    return { success: false, error: 'JPEG・PNG・GIF・WebP のみアップロードできます。' }
  }
  if (file.size > MYOU_PRODUCT_MANUAL_MAX_BYTES) {
    return {
      success: false,
      error: `ファイルサイズは ${MYOU_PRODUCT_MANUAL_MAX_MB}MB 以下にしてください。`,
    }
  }

  const supabase = await createClient()
  const ext = extFromFile(file)
  const storagePath = buildProductManualStoragePath(user.tenant_id, manualType, ext)
  const buf = Buffer.from(await file.arrayBuffer())

  // 既存メタデータを取得（拡張子変更時の旧ファイル削除用）
  const { data: existing } = await supabase
    .from('myou_product_manuals')
    .select('id, storage_path')
    .eq('tenant_id', user.tenant_id)
    .eq('manual_type', manualType)
    .maybeSingle()

  const { error: upErr } = await supabase.storage
    .from(MYOU_PRODUCT_MANUALS_BUCKET)
    .upload(storagePath, buf, { contentType: file.type, upsert: true })

  if (upErr) {
    return { success: false, error: `画像のアップロードに失敗しました: ${upErr.message}` }
  }

  const { data: urlData } = supabase.storage
    .from(MYOU_PRODUCT_MANUALS_BUCKET)
    .getPublicUrl(storagePath)
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const row = {
    tenant_id: user.tenant_id,
    manual_type: manualType,
    label,
    storage_path: storagePath,
    public_url: publicUrl,
    content_type: file.type,
    file_name: `${PRODUCT_MANUAL_LABELS[manualType]}.${ext}`,
    uploaded_by: user.employee_id,
  }

  const { data: saved, error: dbErr } = await supabase
    .from('myou_product_manuals')
    .upsert(row, { onConflict: 'tenant_id,manual_type' })
    .select(
      'id, tenant_id, manual_type, label, storage_path, public_url, content_type, file_name, updated_at'
    )
    .single()

  if (dbErr || !saved) {
    return {
      success: false,
      error: `画像情報の保存に失敗しました: ${dbErr?.message ?? '不明なエラー'}`,
    }
  }

  // 拡張子が変わった場合は旧オブジェクトを削除
  if (existing?.storage_path && existing.storage_path !== storagePath) {
    await supabase.storage.from(MYOU_PRODUCT_MANUALS_BUCKET).remove([existing.storage_path])
  }

  revalidatePath(APP_ROUTES.MYOU.PRODUCT_MANUALS)
  revalidatePath(APP_ROUTES.PUBLIC.MYOU_PRODUCT_MANUALS)

  return {
    success: true,
    manual: saved as ProductManual,
  }
}
