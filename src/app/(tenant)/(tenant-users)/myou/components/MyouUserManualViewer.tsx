'use client'

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { ArrowUp, BookOpen, ChevronRight, List, Printer, X } from 'lucide-react'
import MyouBackLink from './MyouBackLink'
import { APP_ROUTES } from '@/config/routes'
import type { MyouManualTocItem } from '@/features/myou/manual/types'
import { extractPlainText, slugifyHeading } from '@/features/myou/manual/slug'

type Props = {
  markdown: string
  toc: MyouManualTocItem[]
}

/** 見出しコンポーネント（アンカー ID 付き） */
function Heading({
  level,
  children,
  className,
}: {
  level: 2 | 3 | 4
  children: ReactNode
  className: string
}) {
  const text = extractPlainText(children)
  const id = slugifyHeading(text)
  const Tag = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4'

  return (
    <Tag id={id} className={`scroll-mt-28 ${className}`}>
      {children}
    </Tag>
  )
}

/** 段落が画像のみか（react-markdown は単独画像を p で包むため figure を p 内に置けない） */
function isImageOnlyParagraph(children: ReactNode): boolean {
  // 空白テキストノードは無視する
  const nodes = Children.toArray(children).filter(node => {
    if (typeof node === 'string') return node.trim().length > 0
    return true
  })
  if (nodes.length !== 1 || !isValidElement(nodes[0])) return false
  const child = nodes[0]
  // 標準タグ、またはカスタム img（type が関数で src を持つ）
  if (child.type === 'img' || child.type === 'figure') return true
  const props = child.props as { src?: unknown } | null
  return typeof props?.src === 'string'
}

/** 同一ページ内リンクのスムーススクロール */
function scrollToAnchor(href: string) {
  const id = href.replace(/^#/, '')
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
  }
}

/**
 * mYou ユーザマニュアル表示（目次・スクロール追従・モバイル対応）
 */
export default function MyouUserManualViewer({ markdown, toc }: Props) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? '')
  const [tocOpen, setTocOpen] = useState(false)
  const [showTop, setShowTop] = useState(false)

  const sectionIds = useMemo(() => toc.map(item => item.id), [toc])

  const handleTocClick = useCallback((id: string) => {
    scrollToAnchor(`#${id}`)
    setActiveId(id)
    setTocOpen(false)
  }, [])

  // スクロール位置に応じて目次の現在地と「トップへ」を更新
  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 480)

      const offset = 120
      let current = sectionIds[0] ?? ''
      for (const id of sectionIds) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= offset) {
          current = id
        }
      }
      setActiveId(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sectionIds])

  // URL ハッシュで初期スクロール
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace(/^#/, '')
      window.setTimeout(() => scrollToAnchor(`#${id}`), 100)
    }
  }, [])

  const components: Components = useMemo(
    () => ({
      h1: ({ children }) => (
        <h1 className="mb-4 text-2xl font-bold text-gray-900 sm:text-3xl">{children}</h1>
      ),
      h2: ({ children }) => (
        <Heading
          level={2}
          className="mb-4 mt-12 border-b border-blue-100 pb-2 text-xl font-bold text-blue-800 first:mt-0"
        >
          {children}
        </Heading>
      ),
      h3: ({ children }) => (
        <Heading
          level={3}
          className="mb-3 mt-8 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-base font-semibold text-indigo-900"
        >
          {children}
        </Heading>
      ),
      h4: ({ children }) => (
        <Heading level={4} className="mb-2 mt-5 text-sm font-semibold text-gray-800">
          {children}
        </Heading>
      ),
      p: ({ children }) =>
        // 画像のみの段落は p を出さず、カスタム img（figure）をそのまま描画する
        isImageOnlyParagraph(children) ? (
          <>{children}</>
        ) : (
          <p className="mb-4 text-sm leading-7 text-gray-700 last:mb-0 sm:text-[0.9375rem]">
            {children}
          </p>
        ),
      ul: ({ children }) => (
        <ul className="mb-4 list-disc space-y-1 pl-6 text-sm leading-7 text-gray-700 sm:text-[0.9375rem]">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-4 list-decimal space-y-1 pl-6 text-sm leading-7 text-gray-700 sm:text-[0.9375rem]">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="leading-7 [&>p]:mb-0">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className="mb-4 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {children}
        </blockquote>
      ),
      code: ({ children }) => (
        <code className="rounded bg-gray-900 px-1.5 py-0.5 font-mono text-xs text-white sm:text-sm">
          {children}
        </code>
      ),
      pre: ({ children }) => (
        <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100 sm:text-sm">
          {children}
        </pre>
      ),
      img: ({ src, alt }) => (
        <figure className="mb-6">
          <img
            src={src ?? ''}
            alt={alt ?? ''}
            loading="lazy"
            className="w-full rounded-lg border border-gray-200 bg-white object-contain shadow-sm"
          />
          {alt ? (
            <figcaption className="mt-2 text-center text-xs text-gray-500">{alt}</figcaption>
          ) : null}
        </figure>
      ),
      a: ({ href, children }) => {
        if (href?.startsWith('#')) {
          return (
            <button
              type="button"
              onClick={() => scrollToAnchor(href)}
              className="text-left font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
            >
              {children}
            </button>
          )
        }
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900"
          >
            {children}
          </a>
        )
      },
      table: ({ children }) => (
        <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200 shadow-xs">
          <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
      tbody: ({ children }) => (
        <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
      ),
      tr: ({ children }) => <tr className="hover:bg-gray-50/80">{children}</tr>,
      th: ({ children }) => (
        <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-gray-700 sm:px-4 sm:py-2.5">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="px-3 py-2 align-top text-gray-700 sm:px-4 sm:py-2.5">{children}</td>
      ),
      hr: () => <hr className="my-10 border-gray-200" />,
      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
    }),
    []
  )

  const tocPanel = (
    <nav aria-label="マニュアル目次" className="space-y-1">
      {toc.map(item => {
        const isActive = activeId === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTocClick(item.id)}
            className={`flex w-full items-start gap-1 rounded-md px-2 py-1.5 text-left text-xs transition-colors sm:text-sm ${
              item.level === 3 ? 'pl-5' : 'font-medium'
            } ${
              isActive
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {item.level === 2 ? (
              <ChevronRight
                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
              />
            ) : (
              <span className="mt-0.5 inline-block w-3.5 shrink-0" />
            )}
            <span>{item.title}</span>
          </button>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24 print:bg-white print:pb-0">
      {/* ヘッダー */}
      <div className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="truncate">製品トレーサビリティ</span>
            </div>
            <h1 className="truncate text-lg font-bold text-gray-900 sm:text-xl">
              ユーザマニュアル
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <MyouBackLink />
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 sm:inline-flex"
            >
              <Printer className="h-3.5 w-3.5" />
              印刷
            </button>
            <button
              type="button"
              onClick={() => setTocOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 lg:hidden"
            >
              <List className="h-3.5 w-3.5" />
              目次
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8 lg:py-8 print:block print:px-6 print:py-0">
        {/* デスクトップ目次 */}
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-28 max-h-[calc(100vh-15rem)] overflow-y-auto overscroll-contain scroll-pb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">目次</p>
            {tocPanel}
            <div className="mt-6 space-y-2 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500">関連画面</p>
              <QuickLink href={APP_ROUTES.MYOU.RECEIVING_SCAN} label="入荷登録" />
              <QuickLink href={APP_ROUTES.MYOU.INVENTORY} label="在庫一覧" />
              <QuickLink href={APP_ROUTES.MYOU.DELIVERY_SCAN} label="出荷登録" />
            </div>
          </div>
        </aside>

        {/* 本文 */}
        <article className="print-area min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-6 shadow-xs sm:px-6 sm:py-8 print:border-0 print:px-0 print:py-0 print:shadow-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
            {markdown}
          </ReactMarkdown>
        </article>
      </div>

      {/* モバイル目次ドロワー */}
      {tocOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="目次を閉じる"
            className="absolute inset-0 bg-black/40"
            onClick={() => setTocOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-hidden rounded-t-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="font-semibold text-gray-900">目次</p>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-3">{tocPanel}</div>
          </div>
        </div>
      ) : null}

      {/* トップへ */}
      {showTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-4 z-30 inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-blue-700 print:hidden"
        >
          <ArrowUp className="h-4 w-4" />
          トップへ
        </button>
      ) : null}
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="block rounded-md px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 hover:underline"
    >
      {label}
    </a>
  )
}
