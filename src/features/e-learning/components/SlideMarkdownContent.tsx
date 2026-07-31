'use client'

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

const slideMarkdownComponents: Components = {
  h1: ({ children }) => <h1 className="mb-2 text-lg font-bold text-gray-800">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-base font-bold text-gray-800 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-3 text-sm font-semibold text-gray-800 first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed [&>p]:mb-0">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-[#FD7601] underline">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">
      {children}
    </code>
  ),
}

interface Props {
  content: string
  className?: string
}

/** eラーニングスライド本文（Markdown対応欄）を統一スタイルで表示する */
export function SlideMarkdownContent({ content, className }: Props) {
  return (
    <div className={className ?? 'text-sm text-gray-700 leading-relaxed break-words'}>
      <ReactMarkdown components={slideMarkdownComponents}>{content}</ReactMarkdown>
    </div>
  )
}
