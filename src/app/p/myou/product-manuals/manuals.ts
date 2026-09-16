import type { LucideIcon } from 'lucide-react'
import type { ProductManualType } from '@/features/myou/types'
import { PRODUCT_MANUAL_LABELS } from '@/features/myou/types'
import {
  PRODUCT_MANUAL_ICONS,
  PRODUCT_MANUAL_TYPES,
} from '@/features/myou/product-manuals-constants'
import { APP_ROUTES } from '@/config/routes'

/** 購入客向け取扱説明書メニュー（画像表示ページへの導線） */
export type ProductManualItem = {
  id: ProductManualType
  label: string
  href: string
  icon: LucideIcon
}

export const PRODUCT_MANUALS: ProductManualItem[] = PRODUCT_MANUAL_TYPES.map(id => ({
  id,
  label: PRODUCT_MANUAL_LABELS[id],
  href: APP_ROUTES.PUBLIC.MYOU_PRODUCT_MANUAL(id),
  icon: PRODUCT_MANUAL_ICONS[id],
}))
