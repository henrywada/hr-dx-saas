'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type DocPreviewKind = 'image' | 'pdf'

export type DocPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  src: string
  kind: DocPreviewKind
}

/** 資料一覧用：画像または PDF をモーダルでプレビューする */
export default function DocPreviewModal({
  open,
  onOpenChange,
  title,
  src,
  kind,
}: DocPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40">
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">{title}</DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            {kind === 'pdf' ? `${title}のPDFプレビュー` : `${title}の画像プレビュー`}
          </DialogPrimitive.Description>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-50 px-4 py-4 sm:px-6 sm:py-5">
          {kind === 'image' ? (
            <img src={src} alt={title} className="mx-auto max-h-[70vh] w-full object-contain" />
          ) : (
            <iframe
              title={title}
              src={src}
              className="h-[70vh] w-full rounded-md border border-gray-200 bg-white"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
