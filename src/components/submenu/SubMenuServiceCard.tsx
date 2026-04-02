'use client'

import Link, { useLinkStatus } from 'next/link'
import { Loader2 } from 'lucide-react'

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
  /** admin: 管理サブメニュー。portal / saas: ラベル小さめ・説明は line-clamp */
  layout: SubMenuServiceCardLayout
}

function titleRowClass(layout: SubMenuServiceCardLayout, accent: string): string {
  if (layout === 'admin') {
    return `text-base font-bold tracking-wider mb-2 ${accent}`
  }
  return `text-xs font-bold uppercase tracking-wider mb-2 ${accent}`
}

function descriptionClass(layout: SubMenuServiceCardLayout): string {
  if (layout === 'admin') {
    return 'text-sm text-slate-500 leading-relaxed whitespace-pre-wrap mt-2'
  }
  if (layout === 'portal') {
    return 'text-sm text-slate-500 leading-relaxed line-clamp-3 mt-1 whitespace-pre-line'
  }
  return 'text-sm text-slate-500 leading-relaxed line-clamp-3 mt-1'
}

/** Link 直下で useLinkStatus を使う（next/link のナビ待ちを検知） */
function SubMenuServiceCardInner({
  variant,
  title,
  name,
  description,
  layout,
}: Omit<Props, 'href'>) {
  const { pending } = useLinkStatus()

  return (
    <>
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${variant.bar}`} />

      {pending ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-slate-600" aria-hidden />
            処理中…
          </span>
        </div>
      ) : null}

      <div className="p-5 pl-7 w-full flex flex-col h-full">
        {title ? (
          <div className={titleRowClass(layout, variant.text)}>{title}</div>
        ) : (
          <div className="h-4 mb-2" />
        )}

        <h3 className={`text-lg font-bold text-slate-900 mb-2 transition-colors ${variant.hover}`}>
          {name}
        </h3>

        {description ? (
          <p className={descriptionClass(layout)}>{description}</p>
        ) : null}

        <div className="mt-auto pt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <span className={`${variant.text}`}>→</span>
        </div>
      </div>
    </>
  )
}

export function SubMenuServiceCard({ href, variant, title, name, description, layout }: Props) {
  return (
    <Link
      href={href}
      className={`
        flex flex-col text-left group
        bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300
        border border-slate-100 hover:border-slate-200 hover:-translate-y-1
        overflow-hidden relative h-full
      `}
    >
      <SubMenuServiceCardInner
        variant={variant}
        title={title}
        name={name}
        description={description}
        layout={layout}
      />
    </Link>
  )
}
