'use client'

import React, { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { InquiryChatPanel } from '@/features/inquiry-chat/components/InquiryChatPanel'
import { HrInquiryMailForm } from './HrInquiryMailForm'
import { cn } from '@/lib/utils'

const triggerClassName =
  'inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors shrink-0 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-700'

type Tab = 'chat' | 'mail'

export function HrInquiryModal() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('chat')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName}>
          ❓人事へのお問合せ
        </button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[min(92vh,720px)] w-[calc(100%-1.5rem)] max-w-[640px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b border-neutral-100 px-6 pb-4 pt-6 pr-14 sm:px-8 sm:pr-16">
          <DialogTitle>人事へのお問合せ</DialogTitle>
          <DialogPrimitive.Description className="text-sm text-neutral-600">
            登録された制度文書に基づく AI による回答、または人事担当へのメール送信ができます。
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="flex shrink-0 gap-1 border-b border-neutral-100 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={cn(
              'rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              tab === 'chat'
                ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50',
            )}
          >
            AIチャット
          </button>
          <button
            type="button"
            onClick={() => setTab('mail')}
            className={cn(
              'rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
              tab === 'mail'
                ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50',
            )}
          >
            人事へメール
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {tab === 'chat' && (
            <div className="space-y-3">
              <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                AI で解決しない場合は「人事へメール」タブからご連絡ください。
              </p>
              <InquiryChatPanel variant="modal" />
            </div>
          )}
          {tab === 'mail' && <HrInquiryMailForm />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
