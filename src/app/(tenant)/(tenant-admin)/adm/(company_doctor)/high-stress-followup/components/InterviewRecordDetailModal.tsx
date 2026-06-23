'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X } from 'lucide-react';
import type { StressInterviewRecord } from '@/features/adm/high-stress-followup/types';
import { updateInterviewRecord } from '@/features/adm/high-stress-followup/actions';

type HistoryRecord = StressInterviewRecord & { anonymousId: string };

interface Props {
  record: HistoryRecord;
  onClose: () => void;
  onSaved: () => void;
}

export function InterviewRecordDetailModal({ record, onClose, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [interviewDate, setInterviewDate] = useState(
    () => record.interviewDate.slice(0, 16).replace(' ', 'T')
  );
  const [doctorOpinion, setDoctorOpinion] = useState(record.doctorOpinion ?? '');
  const [measureType, setMeasureType] = useState(record.measureType ?? '');
  const [measureDetails, setMeasureDetails] = useState(record.measureDetails ?? '');
  const [followUpDate, setFollowUpDate] = useState(
    record.followUpDate ? record.followUpDate.slice(0, 10) : ''
  );
  const [followUpStatus, setFollowUpStatus] = useState(record.followUpStatus ?? '未実施');

  const handleSave = () => {
    if (record.status === 'completed' && !doctorOpinion.trim()) {
      alert('実施済の場合は医師意見が必須です');
      return;
    }

    startTransition(async () => {
      try {
        await updateInterviewRecord(record.id, {
          interviewDate: `${interviewDate.replace('T', ' ')}:00`,
          doctorOpinion: doctorOpinion.trim() || null,
          measureType: measureType || null,
          measureDetails: measureDetails || null,
          followUpDate: followUpDate || null,
          followUpStatus,
        });
        setIsEditing(false);
        onSaved();
      } catch (err) {
        alert((err as Error).message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">
            面接記録詳細 - {record.anonymousId}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500 font-semibold">対象者ID</div>
              <div className="font-mono font-bold text-slate-800">{record.anonymousId}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-semibold">実施者</div>
              <div className="text-slate-800">{record.doctorName ?? '-'}</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">面接日時</div>
            {isEditing ? (
              <input
                type="datetime-local"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3"
              />
            ) : (
              <div className="text-slate-800">
                {format(new Date(record.interviewDate), 'yyyy/MM/dd HH:mm', { locale: ja })}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">医師意見</div>
            {isEditing ? (
              <textarea
                value={doctorOpinion}
                onChange={(e) => setDoctorOpinion(e.target.value)}
                rows={5}
                maxLength={500}
                className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 resize-none"
              />
            ) : (
              <div className="text-slate-800 whitespace-pre-wrap">{record.doctorOpinion ?? '-'}</div>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">就業上の措置</div>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={measureType}
                  onChange={(e) => setMeasureType(e.target.value)}
                  placeholder="種類（配置転換、労働時間短縮など）"
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3"
                />
                <input
                  type="text"
                  value={measureDetails}
                  onChange={(e) => setMeasureDetails(e.target.value)}
                  placeholder="詳細"
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3"
                />
              </div>
            ) : (
              <div className="text-slate-800">
                {record.measureType ?? '-'}
                {record.measureDetails && ` / ${record.measureDetails}`}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">フォローアップ予定日</div>
            {isEditing ? (
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3"
              />
            ) : (
              <div className="text-slate-800">
                {record.followUpDate
                  ? format(new Date(record.followUpDate), 'yyyy/MM/dd', { locale: ja })
                  : '-'}
              </div>
            )}
          </div>

          {isEditing && (
            <div>
              <div className="text-xs text-slate-500 font-semibold mb-1">フォローアップ状況</div>
              <select
                value={followUpStatus}
                onChange={(e) => setFollowUpStatus(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3"
              >
                <option value="未実施">未実施</option>
                <option value="実施済">実施済</option>
              </select>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {isPending ? '保存中...' : '保存'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                編集
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
