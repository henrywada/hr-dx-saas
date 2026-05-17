'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { GlobalJobCategory } from '../types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GlobalJobCategoryManager } from './GlobalJobCategoryManager'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: GlobalJobCategory[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

/** 業種カテゴリの追加・編集・削除と、一覧での絞り込み選択をモーダル内で行う */
export function GlobalJobCategoryModal({
  open,
  onOpenChange,
  categories,
  selectedId,
  onSelect,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40"
        closeButtonClassName="text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40"
      >
        <DialogHeader className="shrink-0 rounded-t-xl border-0 bg-primary px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            業種カテゴリ
          </DialogTitle>
          <DialogPrimitive.Description className="mt-1 text-sm leading-snug text-white/90">
            全テナント共通の業種です。一覧から選ぶと、メイン画面の職種リストの絞り込みと同期します。
          </DialogPrimitive.Description>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 [scrollbar-gutter:stable]">
          <GlobalJobCategoryManager
            categories={categories}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
