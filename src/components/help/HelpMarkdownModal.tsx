'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MarkdownHelpBody } from './MarkdownHelpBody';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  markdown: string;
  /** スクリーンリーダー用の短い説明 */
  srDescription?: string;
};

/** マニュアル集と同一クローム＋Markdown 本文のモーダル（他画面からも再利用可） */
export function HelpMarkdownModal({ open, onOpenChange, title, markdown, srDescription }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-[800px] flex flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40">
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">{title}</DialogTitle>
          {srDescription ? (
            <DialogPrimitive.Description className="sr-only">{srDescription}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6 [scrollbar-gutter:stable]">
          <MarkdownHelpBody markdown={markdown} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
