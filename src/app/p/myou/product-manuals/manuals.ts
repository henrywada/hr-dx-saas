import { Bath, Wind, type LucideIcon } from 'lucide-react'
import type { ProductManualType } from '@/features/myou/types'
import { PRODUCT_MANUAL_LABELS } from '@/features/myou/types'
import { APP_ROUTES } from '@/config/routes'

/** 購入客向け取扱説明書メニュー（画像表示ページへの導線） */
export type ProductManualItem = {
  id: ProductManualType
  label: string
  href: string
  icon: LucideIcon
}

export const PRODUCT_MANUALS: ProductManualItem[] = [
  {
    id: 'aircon',
    label: PRODUCT_MANUAL_LABELS.aircon,
    href: APP_ROUTES.PUBLIC.MYOU_PRODUCT_MANUAL('aircon'),
    icon: Wind,
  },
  {
    id: 'bathroom',
    label: PRODUCT_MANUAL_LABELS.bathroom,
    href: APP_ROUTES.PUBLIC.MYOU_PRODUCT_MANUAL('bathroom'),
    icon: Bath,
  },
]
