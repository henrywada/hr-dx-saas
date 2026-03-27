'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

/** マニュアル集・勤怠3方式ガイドと同一の見出し・本文スタイル */
export const markdownHelpComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 text-2xl font-semibold text-gray-900">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-8 text-xl font-semibold text-gray-900 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 rounded-md border-l-4 border-indigo-400 bg-indigo-50 px-3 py-2 font-semibold text-gray-900">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mb-4 text-gray-700 leading-7 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-4 list-disc pl-6 text-gray-700 leading-7 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal pl-6 text-gray-700 leading-7 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-gray-700 leading-7 [&>p]:mb-0">{children}</li>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-900 px-1 py-0.5 font-mono text-sm text-white">{children}</code>
  ),
  img: ({ src, alt }) => (
    <img
      src={src ?? ''}
      alt={alt ?? ''}
      className="mb-6 w-full rounded-lg border border-gray-200 object-contain shadow-sm"
    />
  ),
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  hr: () => <hr className="my-8 border-gray-200" />,
};

type Props = {
  markdown: string;
  className?: string;
};

/** ヘルプ用 Markdown 本文（スタイル統一） */
export function MarkdownHelpBody({ markdown, className }: Props) {
  return (
    <div
      className={
        className ??
        'text-sm text-gray-700 leading-7 sm:text-[0.9375rem] [&_strong]:font-semibold [&_strong]:text-gray-900'
      }
    >
      <ReactMarkdown components={markdownHelpComponents} skipHtml>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
