'use client';

import React, { useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { MANUAL_CATEGORIES, type ManualEntry } from './manualData';
import { ManualDetailModal } from './ManualDetailModal';
import { AttendanceMethodsModal } from './components/AttendanceMethodsModal';

/** マニュアル集：カテゴリー一覧とモーダル制御 */
export function ManualCollectionClient() {
  const [selected, setSelected] = useState<ManualEntry | null>(null);
  const [attendanceMethodsOpen, setAttendanceMethodsOpen] = useState(false);

  const openEntry = useCallback((entry: ManualEntry) => {
    setSelected(entry);
  }, []);

  const closeModal = useCallback(() => {
    setSelected(null);
  }, []);

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
                {cat.id === 'attendance' && (
                  <li key="attendance-methods-guide">
                    <button
                      type="button"
                      onClick={() => setAttendanceMethodsOpen(true)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors group"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0" />
                      <span className="flex-1">勤怠管理の3つのデータ取得方法</span>
                    </button>
                  </li>
                )}
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

      <ManualDetailModal open={selected !== null} entry={selected} onClose={closeModal} />
      <AttendanceMethodsModal open={attendanceMethodsOpen} onOpenChange={setAttendanceMethodsOpen} />
    </>
  );
}
