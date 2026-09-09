/**
 * mYou 製品取扱説明書（画像）の定数
 * 公開 QR 向けのためテナント非依存。実体は Supabase Storage（環境別）。
 * Git / public/ には置かない → ローカル検証画像は本番に混入しない。
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
 * Storage パス（テナント非依存）: {manual_type}.{ext}
 * DB の label / file_name は日本語名称を使用する
 */
export function buildProductManualStoragePath(
  manualType: ProductManualType,
  ext: string
): string {
  const safeExt = ext.replace(/^\./, '').toLowerCase() || 'png'
  return `${manualType}.${safeExt}`
}
