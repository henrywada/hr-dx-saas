/**
 * mYou 製品取扱説明書（画像）の定数
 * 実体は Supabase Storage（Git / public/ には置かない → ローカル検証が本番に混入しない）
 */
import type { ProductManualType } from './types'
import { PRODUCT_MANUAL_LABELS } from './types'

export const MYOU_PRODUCT_MANUALS_BUCKET = 'myou-product-manuals' as const

export const MYOU_PRODUCT_MANUAL_MAX_BYTES = 10 * 1024 * 1024
export const MYOU_PRODUCT_MANUAL_MAX_MB = 10

export const MYOU_PRODUCT_MANUAL_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export const PRODUCT_MANUAL_TYPES: ProductManualType[] = ['aircon', 'bathroom']

export function getProductManualLabel(type: ProductManualType): string {
  return PRODUCT_MANUAL_LABELS[type]
}

/**
 * Storage パス: {tenant_id}/{manual_type}.{ext}
 * 表示名・DB の label / file_name は日本語名称を使用する
 */
export function buildProductManualStoragePath(
  tenantId: string,
  manualType: ProductManualType,
  ext: string
): string {
  const safeExt = ext.replace(/^\./, '').toLowerCase() || 'png'
  return `${tenantId}/${manualType}.${safeExt}`
}

/** 公開ページ用テナントID（未設定時はローカル検証向けに最新1件フォールバック） */
export function getMyouPublicTenantId(): string | null {
  const raw = (process.env.MYOU_PUBLIC_TENANT_ID ?? '').trim()
  return raw.length > 0 ? raw : null
}
