'use client'

import React, { useEffect, useState } from 'react'
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

type Props = {
  /** false のとき AI チャット無効（登録済み RAG なし） */
  aiChatEnabled?: boolean
  /** false のとき「人事へメール」無効（基本設定に hr_inquiry_email 未登録） */
  hrMailEnabled?: boolean
}

export function HrInquiryModal({ aiChatEnabled = true, hrMailEnabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>(() => {
    if (aiChatEnabled) return 'chat'
    if (hrMailEnabled) return 'mail'
    return 'chat'
  })

  useEffect(() => {
    if (!aiChatEnabled && hrMailEnabled) setTab('mail')
    else if (aiChatEnabled && !hrMailEnabled) setTab('chat')
    else if (!aiChatEnabled && !hrMailEnabled) setTab('chat')
  }, [aiChatEnabled, hrMailEnabled])

  const anyFeatureEnabled = aiChatEnabled || hrMailEnabled

  const descriptionText = (() => {
    if (aiChatEnabled && hrMailEnabled) {
      return '登録された制度文書に基づく AI による回答、または人事担当へのメール送信ができます。'
    }
    if (aiChatEnabled && !hrMailEnabled) {
      return '登録された制度文書に基づく AI による回答ができます。メール送信は管理画面の「基本設定」で宛先を登録するとご利用いただけます。'
    }
    if (!aiChatEnabled && hrMailEnabled) {
      return '人事担当へのメール送信ができます。（制度文書が登録されると AI チャットもご利用いただけます）'
    }
    return '現在、AI チャット・人事メールのいずれもご利用いただけません。管理者に制度文書の登録や「基本設定」でのメール宛先登録をご確認ください。'
  })()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName}>
          ❓人事へのお問合せ
        </button>
      </DialogTrigger>
      {/* シェルは HelpMarkdownModal と同一（my_help_modal_style / help-modal-style.mdc） */}
      <DialogContent
        className="max-h-[80vh] max-w-[800px] flex flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            人事へのお問合せ
          </DialogTitle>
          <DialogPrimitive.Description className="sr-only">{descriptionText}</DialogPrimitive.Description>
        </DialogHeader>

        {anyFeatureEnabled ? (
          <>
            <div className="shrink-0 border-b border-neutral-100 px-6 pt-4 sm:px-8">
              <p className="text-sm leading-relaxed text-neutral-600">{descriptionText}</p>
              <div className="-mb-px mt-3 flex gap-1">
                <button
                  type="button"
                  disabled={!aiChatEnabled}
                  title={!aiChatEnabled ? '制度文書が登録されるまでご利用いただけません' : undefined}
                  onClick={() => aiChatEnabled && setTab('chat')}
                  className={cn(
                    'rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    !aiChatEnabled && 'cursor-not-allowed opacity-45 text-neutral-400',
                    aiChatEnabled && tab === 'chat'
                      ? 'border-b-2 border-indigo-600 bg-indigo-50/50 text-indigo-700'
                      : aiChatEnabled && 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                  )}
                >
                  AIチャット
                </button>
                <button
                  type="button"
                  disabled={!hrMailEnabled}
                  title={
                    !hrMailEnabled
                      ? '管理画面の「基本設定」で人事宛メールを登録するとご利用いただけます'
                      : undefined
                  }
                  onClick={() => hrMailEnabled && setTab('mail')}
                  className={cn(
                    'rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
                    !hrMailEnabled && 'cursor-not-allowed opacity-45 text-neutral-400',
                    hrMailEnabled && tab === 'mail'
                      ? 'border-b-2 border-indigo-600 bg-indigo-50/50 text-indigo-700'
                      : hrMailEnabled && 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                  )}
                >
                  人事へメール
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6 [scrollbar-gutter:stable]">
              {tab === 'chat' && aiChatEnabled && (
                <div className="space-y-3">
                  {hrMailEnabled ? (
                    <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      AI で解決しない場合は「人事へメール」タブからご連絡ください。
                    </p>
                  ) : (
                    <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      人事へのメール連絡は、管理画面の「基本設定」で宛先を登録するとご利用いただけます。
                    </p>
                  )}
                  <InquiryChatPanel variant="modal" />
                </div>
              )}
              {tab === 'mail' && hrMailEnabled && <HrInquiryMailForm />}
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6 [scrollbar-gutter:stable]">
            <p className="text-sm leading-relaxed text-neutral-600">{descriptionText}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              制度文書（AI チャット）の登録、または「基本設定」での人事宛メールの登録が必要です。
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
