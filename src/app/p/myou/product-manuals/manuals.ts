import { Bath, Wind, type LucideIcon } from 'lucide-react'

/** 購入客向け取扱説明書メニュー（静的定数・DB なし） */
export type ProductManualItem = {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

export const PRODUCT_MANUALS: ProductManualItem[] = [
  {
    id: 'aircon',
    label: 'エアコン用取扱説明書',
    href: 'https://chatgpt.com/s/m_6a62d057d7788191be18f5781f4aa98b',
    icon: Wind,
  },
  {
    id: 'bathroom',
    label: '浴室用取扱説明書',
    href: 'https://chatgpt.com/s/m_6a62d07c27508191a834d50cff41a6e8',
    icon: Bath,
  },
]
