'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, ChevronRight, FileText, ImageIcon } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import MyouBackLink from './MyouBackLink'
import DocPreviewModal, { type DocPreviewKind } from './DocPreviewModal'

const OVERVIEW_IMG = '/myou/manual/img/製品トレーサビリティ管理の全体像.png'
const QUICK_PDF = '/myou/manual/pdf/簡単操作マニュアル.pdf'

type PreviewState = {
  title: string
  src: string
  kind: DocPreviewKind
} | null

type TocAction =
  | { type: 'preview'; title: string; src: string; kind: DocPreviewKind; label: '開く' }
  | { type: 'link'; href: string; label: '進む' }

type TocItem = {
  id: string
  title: string
  description: string
  icon: 'image' | 'pdf' | 'book'
  action: TocAction
}

const TOC_ITEMS: TocItem[] = [
  {
    id: 'overview',
    title: '製品トレーサビリティ管理の全体像',
    description: '業務フローの全体図を確認できます',
    icon: 'image',
    action: {
      type: 'preview',
      title: '製品トレーサビリティ管理の全体像',
      src: OVERVIEW_IMG,
      kind: 'image',
      label: '開く',
    },
  },
  {
    id: 'quick-manual',
    title: '簡単操作マニュアル',
    description: '日常操作の手順を PDF で確認できます',
    icon: 'pdf',
    action: {
      type: 'preview',
      title: '簡単操作マニュアル',
      src: QUICK_PDF,
      kind: 'pdf',
      label: '開く',
    },
  },
  {
    id: 'spec',
    title: 'システム仕様書',
    description: '詳細な操作手順書（ユーザマニュアル）へ進みます',
    icon: 'book',
    action: {
      type: 'link',
      href: APP_ROUTES.MYOU.MANUAL,
      label: '進む',
    },
  },
]

function ItemIcon({ kind }: { kind: TocItem['icon'] }) {
  const className = 'h-4 w-4 text-blue-600'
  if (kind === 'image') return <ImageIcon className={className} aria-hidden />
  if (kind === 'pdf') return <FileText className={className} aria-hidden />
  return <BookOpen className={className} aria-hidden />
}

const actionButtonClass =
  'inline-flex shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100'

type PreviewAction = Extract<TocAction, { type: 'preview' }>

function PreviewOpenButton({
  action,
  className,
  onOpen,
}: {
  action: PreviewAction
  className: string
  onOpen: (preview: PreviewState) => void
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onOpen({
          title: action.title,
          src: action.src,
          kind: action.kind,
        })
      }
      className={className}
    >
      {action.label}
      <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
    </button>
  )
}

/** 資料一覧（本の目次風・カードレイアウト） */
export default function DocIndexClient() {
  const [preview, setPreview] = useState<PreviewState>(null)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {/* カードヘッダー */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-5 py-5 sm:px-8 sm:py-6">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-blue-600">
              <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>製品トレーサビリティ</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-blue-700 sm:text-[1.65rem]">
              資料一覧
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              目次 — マニュアル・資料をこちらから開けます
            </p>
          </div>
          <MyouBackLink className="shrink-0 self-start" />
        </div>

        {/* 目次リスト */}
        <nav aria-label="資料目次" className="divide-y divide-slate-100">
          {TOC_ITEMS.map((item, index) => (
            <div
              key={item.id}
              className="group flex flex-col gap-3 px-5 py-5 transition-colors hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-6"
            >
              <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50/80"
                  aria-hidden
                >
                  <ItemIcon kind={item.icon} />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-medium tracking-wide text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900 sm:text-base">
                    <span className="mr-1.5 text-slate-300" aria-hidden>
                      ◆
                    </span>
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-[0.8125rem]">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.action.type === 'preview' ? (
                <PreviewOpenButton
                  action={item.action}
                  className={actionButtonClass}
                  onOpen={setPreview}
                />
              ) : (
                <Link href={item.action.href} className={actionButtonClass}>
                  {item.action.label}
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* preview があるときだけマウントし、空の src を渡さない */}
      {preview ? (
        <DocPreviewModal
          open
          onOpenChange={nextOpen => {
            if (!nextOpen) setPreview(null)
          }}
          title={preview.title}
          src={preview.src}
          kind={preview.kind}
        />
      ) : null}
    </div>
  )
}
