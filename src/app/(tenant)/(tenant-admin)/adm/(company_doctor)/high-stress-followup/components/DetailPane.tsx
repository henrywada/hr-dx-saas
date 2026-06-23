'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { HighStressListItem, StressInterviewRecord } from '@/features/adm/high-stress-followup/types';
import { fetchInterviewRecordsByResultId } from '@/features/adm/high-stress-followup/actions';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, FileText, ClipboardList, ExternalLink } from 'lucide-react';
import { InterviewRecordForm } from './InterviewRecordForm';
import { APP_ROUTES } from '@/config/routes';

interface Props {
  item: HighStressListItem | null;
  periodId: string;
  onRecordSaved?: () => void;
}

export function DetailPane({ item, periodId, onRecordSaved }: Props) {
  const [records, setRecords] = useState<StressInterviewRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'appointment' | 'record' | 'measure'>('record');

  const refetchRecords = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    try {
      const data = await fetchInterviewRecordsByResultId(item.stressResultId);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [item?.stressResultId]);

  useEffect(() => {
    if (!item) {
      setRecords([]);
      return;
    }
    refetchRecords();
  }, [item?.stressResultId, refetchRecords]);

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <FileText className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">左のリストから対象者を選択してください</p>
      </div>
    );
  }

  const statusLabel =
    item.hasMeasureDecided
      ? '措置決定済'
      : item.latestStatus === 'pending'
        ? '未実施'
        : item.latestStatus === 'scheduled'
          ? '予約済'
          : item.latestStatus === 'completed'
            ? '完了'
            : 'キャンセル';

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">
                対象者ID
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono">{item.anonymousId}</div>
              <div className="text-sm text-slate-600 mt-1">
                所属部署: {item.divisionAnonymousLabel}
              </div>
            </div>
            <Link
              href={`${APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP}/${item.stressResultId}`}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              詳細を別画面で見る
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500 font-semibold">高ストレス判定日</div>
            <div className="text-slate-800">
              {item.calculatedAt
                ? format(new Date(item.calculatedAt), 'yyyy/MM/dd', { locale: ja })
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">面接実施状況</div>
            <div className="text-slate-800">{statusLabel}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setFormMode('appointment');
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            面接予約する
          </button>
          <button
            type="button"
            onClick={() => {
              setFormMode('record');
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            面接記録を入力
          </button>
          <button
            type="button"
            onClick={() => {
              setFormMode('measure');
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            就業措置を決定
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4" />
            過去の面接・措置履歴
          </h4>
          {loading ? (
            <p className="text-xs text-slate-500">読み込み中...</p>
          ) : records.length === 0 ? (
            <p className="text-xs text-slate-500">履歴はありません</p>
          ) : (
            <ul className="space-y-2">
              {records.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="text-xs text-slate-600 flex justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0"
                >
                  <span>
                    {format(new Date(r.interviewDate), 'yyyy/MM/dd', { locale: ja })}{' '}
                    {r.status === 'completed' ? '面接実施' : r.status === 'scheduled' ? '予約' : r.status}
                  </span>
                  <span className="text-slate-500">
                    医師: {r.doctorName ?? '-'} {r.measureType ? ` / ${r.measureType}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {formOpen && (
        <InterviewRecordForm
          item={item}
          periodId={periodId}
          mode={formMode}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            refetchRecords();
            setFormOpen(false);
            onRecordSaved?.();
          }}
        />
      )}
    </div>
  );
}
