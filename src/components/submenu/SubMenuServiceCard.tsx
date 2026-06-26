'use client'

import Link, { useLinkStatus } from 'next/link'
import { Loader2, ArrowRight, LucideIcon } from 'lucide-react'
import { getServiceIcon } from './getServiceIcon'

export type SubMenuCardVariant = {
  bar: string
  text: string
  hover: string
}

export type SubMenuServiceCardLayout = 'admin' | 'portal' | 'saas'

type Props = {
  href: string
  variant: SubMenuCardVariant
  title: string | null
  name: string
  description: string | null
  serviceName?: string | null
  /** admin: 管理サブメニュー。portal / saas: ラベル小さめ・説明は line-clamp */
  layout: SubMenuServiceCardLayout
}

function titleRowClass(layout: SubMenuServiceCardLayout, accent: string): string {
  if (layout === 'admin') {
    return `text-xs font-bold tracking-wider uppercase mb-1.5 ${accent}`
  }
  return `text-[10px] font-bold uppercase tracking-wider mb-1.5 ${accent}`
}

function descriptionClass(layout: SubMenuServiceCardLayout): string {
  if (layout === 'admin') {
    return 'text-sm text-slate-500 leading-relaxed whitespace-pre-wrap mt-2'
  }
  if (layout === 'portal') {
    return 'text-sm text-slate-500 leading-relaxed line-clamp-3 mt-1.5 whitespace-pre-line'
  }
  return 'text-sm text-slate-500 leading-relaxed line-clamp-3 mt-1.5'
}

/** Link 直下で useLinkStatus を使う（next/link のナビ待ちを検知） */
function SubMenuServiceCardInner({
  variant,
  title,
  name,
  description,
  serviceName,
  layout,
}: Omit<Props, 'href'>) {
  const { pending } = useLinkStatus()
  const Icon = getServiceIcon(null, serviceName)

  return (
    <>
      {/* AIスロップ（サイドストライプ）を排除し、スマートな上部アクセントバーを採用。グループホバー時に太さが自然に変化するマイクロインタラクション */}
      <div
        className={`absolute left-0 right-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5 ${variant.bar}`}
      />

      {pending ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm animate-fade-in">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-slate-600" aria-hidden />
            処理中…
          </span>
        </div>
      ) : null}

      {/* 左右均等かつデバイスサイズに応じたレスポンシブパディング */}
      <div className="p-5 sm:p-6 w-full flex flex-col h-full pt-7">
        {title ? (
          <div className={titleRowClass(layout, variant.text)}>{title}</div>
        ) : (
          <div className="h-4 mb-1.5" />
        )}

        <div className="flex items-start gap-2.5">
          {Icon ? (
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 transition-colors ${variant.text}`} />
          ) : null}
          <div className="flex-1">
            <h3
              className={`text-base sm:text-lg font-bold text-slate-900 mb-1.5 transition-colors ${variant.hover}`}
            >
              {name}
            </h3>

            {description ? <p className={descriptionClass(layout)}>{description}</p> : null}
          </div>
        </div>

        {/* ホバー時に美しくスライドして現れる右向きアロー */}
        <div className="mt-auto pt-4 flex justify-end opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <ArrowRight className={`w-4 h-4 ${variant.text}`} />
        </div>
      </div>
    </>
  )
}

export function SubMenuServiceCard({
  href,
  variant,
  title,
  name,
  description,
  serviceName,
  layout,
}: Props) {
  return (
    <Link
      href={href}
      className={`
        flex flex-col text-left group
        bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300
        border border-slate-200/60 hover:border-slate-300 hover:-translate-y-0.5
        overflow-hidden relative h-full
      `}
    >
      <SubMenuServiceCardInner
        variant={variant}
        title={title}
        name={name}
        description={description}
        serviceName={serviceName}
        layout={layout}
      />
    </Link>
  )
}
