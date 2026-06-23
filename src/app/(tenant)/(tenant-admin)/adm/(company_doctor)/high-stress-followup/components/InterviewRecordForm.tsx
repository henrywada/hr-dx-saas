'use client';

import { useState, useTransition } from 'react';
import type { HighStressListItem } from '@/features/adm/high-stress-followup/types';
import {
  createInterviewRecord,
  createInterviewAppointment,
} from '@/features/adm/high-stress-followup/actions';
import { X } from 'lucide-react';

const MEASURE_OPTIONS = [
  { value: '配置転換', label: '配置転換' },
  { value: '労働時間短縮', label: '労働時間短縮' },
  { value: '休業', label: '休業' },
  { value: 'その他', label: 'その他' },
  { value: '措置不要', label: '措置不要' },
];

interface Props {
  item: HighStressListItem;
  periodId: string;
  mode: 'appointment' | 'record' | 'measure';
  onClose: () => void;
  onSaved: () => void;
}

export function InterviewRecordForm({ item, periodId, mode, onClose, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [interviewDate, setInterviewDate] = useState(
    () => new Date().toISOString().slice(0, 16)
  );
  const [interviewDuration, setInterviewDuration] = useState<number | ''>('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(mode === 'record' || mode === 'measure');
  const [doctorOpinion, setDoctorOpinion] = useState('');
  const [measureType, setMeasureType] = useState<string>('');
  const [measureDetails, setMeasureDetails] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [otherMeasure, setOtherMeasure] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'appointment') {
      startTransition(async () => {
        try {
          await createInterviewAppointment(
            item.stressResultId,
            item.employeeId,
            interviewDate,
            { interviewNotes: interviewNotes || undefined }
          );
          onSaved();
        } catch (err) {
          alert((err as Error).message);
        }
      });
      return;
    }

    const status = isCompleted ? 'completed' : 'scheduled';
    const finalMeasureType =
      measureType === 'その他' ? (otherMeasure ? 'その他' : null) : measureType || null;
    const finalMeasureDetails =
      measureType === 'その他' ? otherMeasure : measureType ? measureDetails : null;

    if (status === 'completed' && !doctorOpinion.trim()) {
      alert('実施済の場合は医師意見が必須です');
      return;
    }
    if (mode === 'measure' && status === 'completed') {
      if (!finalMeasureType) {
        alert('就業措置の種類を選択してください');
        return;
      }
      if (measureType === 'その他' && !otherMeasure.trim()) {
        alert('その他の内容を入力してください');
        return;
      }
    }

    startTransition(async () => {
      try {
        await createInterviewRecord({
          stressResultId: item.stressResultId,
          intervieweeId: item.employeeId,
          interviewDate,
          interviewDuration: interviewDuration === '' ? null : Number(interviewDuration),
          interviewNotes: interviewNotes || null,
          doctorOpinion: doctorOpinion.trim() || null,
          measureType: finalMeasureType,
          measureDetails: finalMeasureDetails,
          followUpDate: followUpDate || null,
          followUpStatus: '未実施',
          status,
        });
        onSaved();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  const title =
    mode === 'appointment'
      ? '面接予約'
      : mode === 'measure'
        ? '就業措置の決定'
        : '面接記録入力';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="interview-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="text-sm text-slate-600">
            対象者ID: <span className="font-mono font-bold">{item.anonymousId}</span>
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

          {mode !== 'appointment' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  面接時間（分）
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={interviewDuration}
                  onChange={(e) =>
                    setInterviewDuration(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="任意"
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  面接内容のメモ
                </label>
                <textarea
                  value={interviewNotes}
                  onChange={(e) => setInterviewNotes(e.target.value)}
                  rows={2}
                  placeholder="任意"
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => setIsCompleted(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-bold text-slate-700">面接実施済みにする</span>
              </label>

              {isCompleted && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      医師意見（必須・第7章(5)）
                    </label>
                    <textarea
                      value={doctorOpinion}
                      onChange={(e) => setDoctorOpinion(e.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder="医師の意見を記録してください"
                      required={isCompleted}
                      className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <div className="text-[10px] text-slate-500 mt-1">
                      {doctorOpinion.length}/500文字
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      就業上の措置
                    </label>
                    <div className="space-y-2">
                      {MEASURE_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="measureType"
                            value={opt.value}
                            checked={measureType === opt.value}
                            onChange={() => setMeasureType(opt.value)}
                            className="border-slate-300"
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                      {measureType === 'その他' && (
                        <input
                          type="text"
                          value={otherMeasure}
                          onChange={(e) => setOtherMeasure(e.target.value)}
                          placeholder="その他の内容"
                          className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      )}
                      {measureType && measureType !== '措置不要' && measureType !== 'その他' && (
                        <input
                          type="text"
                          value={measureDetails}
                          onChange={(e) => setMeasureDetails(e.target.value)}
                          placeholder="具体的な内容"
                          className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      フォローアップ予定日
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'appointment' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">メモ</label>
              <textarea
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
                rows={2}
                placeholder="場所（対面/オンライン）など"
                className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}
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
            form="interview-form"
            disabled={isPending}
            className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition disabled:opacity-50"
          >
            {isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
