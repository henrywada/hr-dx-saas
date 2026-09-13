'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 行のタイトル（モーダル見出し） */
  title: string
  /** ページの本文（詳細）。HTML は描画しない */
  body: string
}

/** HelpMarkdownModal と同シェル。本文はプレーンテキストのみ */
export function BodyModal({ open, onOpenChange, title, body }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-[800px] flex flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40">
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">{title}</DialogTitle>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6 [scrollbar-gutter:stable]">
          <div className="whitespace-pre-wrap text-sm text-slate-700 leading-7">{body}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
