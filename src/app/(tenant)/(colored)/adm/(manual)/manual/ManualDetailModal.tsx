'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { ManualEntry } from './manualData';

type Props = {
  open: boolean;
  entry: ManualEntry | null;
  onClose: () => void;
};

/** マニュアル1件の詳細を表示するモーダル（勤怠ダッシュボードの説明モーダルと同系のクローム） */
export function ManualDetailModal({ open, entry, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-neutral-950/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-detail-title"
        aria-describedby="manual-detail-desc"
        className="relative flex max-h-[80vh] w-full max-w-[800px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
      >
        <div className="shrink-0 rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <h2
            id="manual-detail-title"
            className="text-lg font-semibold leading-snug sm:text-xl"
          >
            {entry.title}
          </h2>
          <p id="manual-detail-desc" className="sr-only">
            マニュアルの説明文です。
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-600"
          aria-label="閉じる"
        >
          <X className="h-[18px] w-[18px]" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 text-gray-700 leading-7 sm:px-8 sm:py-6 [scrollbar-gutter:stable]">
          <p className="whitespace-pre-wrap text-sm sm:text-[0.9375rem]">{entry.body}</p>
        </div>
      </div>
    </div>
  );
}
