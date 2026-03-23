'use client';

import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ATTENDANCE_METHODS_MARKDOWN } from './attendanceMethodsMarkdown';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** ダッシュボードの CardExplanationModal と同じ見出し・本文スタイル */
const markdownComponents: Components = {
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
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  hr: () => <hr className="my-8 border-gray-200" />,
};

const MARKDOWN_WITH_TITLE = `# 勤怠管理の3つのデータ取得方法：仕組みと使い方ガイド マニュアル

${ATTENDANCE_METHODS_MARKDOWN}`;

/** 勤怠管理の3つのデータ取得方法（マークダウン本文）を表示するモーダル */
export function AttendanceMethodsModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-[800px] flex flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40">
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            勤怠管理の3つのデータ取得方法：仕組みと使い方ガイド
          </DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            QRコード打刻・CSV一括取り込み・PC端末ログの3方式の仕組みと手順の説明です。
          </DialogPrimitive.Description>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6 [scrollbar-gutter:stable]">
          <ReactMarkdown components={markdownComponents} skipHtml>
            {MARKDOWN_WITH_TITLE}
          </ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  );
}
