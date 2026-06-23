'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { getHelpMarkdown } from '@/content/help';
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal';
import { MANUAL_CATEGORIES, type ManualEntry } from './manualData';

/** マニュアル集：カテゴリー一覧とモーダル制御 */
export function ManualCollectionClient() {
  const [selected, setSelected] = useState<ManualEntry | null>(null);

  const openEntry = useCallback((entry: ManualEntry) => {
    setSelected(entry);
  }, []);

  const closeModal = useCallback(() => {
    setSelected(null);
  }, []);

  const markdown = selected ? getHelpMarkdown(selected.id) : '';

  const srDescription = useMemo(() => {
    if (!selected) return undefined;
    if (selected.id === 'att-attendance-three-methods') {
      return 'QRコード打刻・CSV一括取り込み・PC端末ログの3方式の仕組みと手順の説明です。';
    }
    if (selected.id === 'att-qr') {
      return 'QR 打刻時のカメラ・位置情報・端末設定に関する注意事項です。';
    }
    return 'マニュアルの説明文です。';
  }, [selected]);

  return (
    <>
      <div className="space-y-10 max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            マニュアル集
          </h1>
          <p className="text-sm text-slate-500">
            カテゴリーを選び、項目をクリックすると説明が表示されます。
          </p>
        </header>

        <div className="space-y-12">
          {MANUAL_CATEGORIES.map((cat) => (
            <section
              key={cat.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div
                className={`px-5 py-4 border-b border-slate-100 bg-linear-to-r ${cat.accentClass} text-white`}
              >
                <h2 className="text-lg font-bold tracking-tight">{cat.name}</h2>
                <p className="text-sm text-white/90 mt-1 leading-relaxed">{cat.description}</p>
              </div>

              <ul className="divide-y divide-slate-100">
                {cat.entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => openEntry(entry)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors group"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                      <span className="flex-1">{entry.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <HelpMarkdownModal
        open={selected !== null}
        onOpenChange={(o) => {
          if (!o) closeModal();
        }}
        title={selected?.title ?? ''}
        markdown={markdown}
        srDescription={srDescription}
      />
    </>
  );
}
