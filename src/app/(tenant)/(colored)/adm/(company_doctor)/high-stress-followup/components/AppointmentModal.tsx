'use client';

import { useState, useTransition } from 'react';
import type { HighStressListItem } from '@/features/adm/high-stress-followup/types';
import { createInterviewAppointment } from '@/features/adm/high-stress-followup/actions';
import { format } from 'date-fns';
import { X } from 'lucide-react';

interface Props {
  periodId: string;
  highStressList: HighStressListItem[];
  initialDate: Date;
  onClose: () => void;
  onSaved: () => void;
}

export function AppointmentModal({
  periodId,
  highStressList,
  initialDate,
  onClose,
  onSaved,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedItem, setSelectedItem] = useState<HighStressListItem | null>(null);
  const [interviewDate, setInterviewDate] = useState(
    () => format(initialDate, "yyyy-MM-dd'T'09:00")
  );
  const [interviewNotes, setInterviewNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      alert('対象者を選択してください');
      return;
    }

    startTransition(async () => {
      try {
        await createInterviewAppointment(
          selectedItem.stressResultId,
          selectedItem.employeeId,
          interviewDate,
          { interviewNotes: interviewNotes || undefined }
        );
        onSaved();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">面接予約を登録</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="appointment-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">対象者（匿名ID）</label>
            <select
              value={selectedItem?.stressResultId ?? ''}
              onChange={(e) => {
                const item = highStressList.find((i) => i.stressResultId === e.target.value);
                setSelectedItem(item ?? null);
              }}
              required
              className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">選択してください</option>
              {highStressList.map((i) => (
                <option key={i.stressResultId} value={i.stressResultId}>
                  {i.anonymousId} - {i.divisionAnonymousLabel}
                  {i.highStressReason ? ` (${i.highStressReason.slice(0, 20)}...)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">面接日時</label>
            <input
              type="datetime-local"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              required
              className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              メモ（場所・オンライン/対面など）
            </label>
            <textarea
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              rows={3}
              placeholder="任意"
              className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="appointment-form"
            disabled={isPending}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition disabled:opacity-50"
          >
            {isPending ? '保存中...' : '予約を登録'}
          </button>
        </div>
      </div>
    </div>
  );
}
