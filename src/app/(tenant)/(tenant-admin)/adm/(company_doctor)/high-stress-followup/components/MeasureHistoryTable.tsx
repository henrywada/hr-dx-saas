'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FileDown, Search } from 'lucide-react';
import type { StressInterviewRecord } from '@/features/adm/high-stress-followup/types';
import { fetchAllInterviewRecords } from '@/features/adm/high-stress-followup/actions';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InterviewRecordDetailModal } from './InterviewRecordDetailModal';

type HistoryRecord = StressInterviewRecord & { anonymousId: string };

interface Props {
  periodId: string;
  onSaved?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '未実施',
  scheduled: '予約済',
  completed: '完了',
  cancelled: 'キャンセル',
};

export function MeasureHistoryTable({ periodId, onSaved }: Props) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAllInterviewRecords(periodId)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [periodId]);

  const filteredRecords = useMemo(() => {
    let list = records;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.anonymousId.toLowerCase().includes(q) ||
          (r.doctorName?.toLowerCase().includes(q) ?? false) ||
          (r.doctorOpinion?.toLowerCase().includes(q) ?? false) ||
          (r.measureType?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    return list;
  }, [records, searchQuery, statusFilter]);

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('高ストレス者面接指導・就業措置記録一覧', 14, 12);
    doc.setFontSize(10);
    doc.text(`出力日時: ${format(new Date(), 'yyyy/MM/dd HH:mm', { locale: ja })}`, 14, 18);

    const headers = [
      '対象者ID',
      '面接日時',
      '実施者',
      '医師意見（要約）',
      '就業措置',
      '詳細',
      'フォローアップ予定日',
      'ステータス',
    ];
    const rows = filteredRecords.map((r) => [
      r.anonymousId,
      format(new Date(r.interviewDate), 'yyyy/MM/dd HH:mm', { locale: ja }),
      r.doctorName ?? '-',
      (r.doctorOpinion ?? '-').slice(0, 40) + ((r.doctorOpinion?.length ?? 0) > 40 ? '...' : ''),
      r.measureType ?? '-',
      r.measureDetails ?? '-',
      r.followUpDate ? format(new Date(r.followUpDate), 'yyyy/MM/dd', { locale: ja }) : '-',
      STATUS_LABELS[r.status] ?? r.status,
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 24,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`面接指導記録_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="対象者ID・医師名・医師意見で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">ステータス</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={filteredRecords.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <FileDown className="w-4 h-4" />
          PDF出力
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
            読み込み中...
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-semibold">対象者ID</th>
                <th className="px-4 py-3 font-semibold">面接日時</th>
                <th className="px-4 py-3 font-semibold">実施者</th>
                <th className="px-4 py-3 font-semibold">医師意見（要約）</th>
                <th className="px-4 py-3 font-semibold">就業措置</th>
                <th className="px-4 py-3 font-semibold">詳細</th>
                <th className="px-4 py-3 font-semibold">フォローアップ予定日</th>
                <th className="px-4 py-3 font-semibold">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    記録はありません
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {r.anonymousId}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {format(new Date(r.interviewDate), 'yyyy/MM/dd HH:mm', { locale: ja })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.doctorName ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      {r.doctorOpinion ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.measureType ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                      {r.measureDetails ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {r.followUpDate
                        ? format(new Date(r.followUpDate), 'yyyy/MM/dd', { locale: ja })
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                          r.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : r.status === 'scheduled'
                              ? 'bg-blue-100 text-blue-700'
                              : r.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
        件数: {filteredRecords.length}件
      </div>

      {selectedRecord && (
        <InterviewRecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSaved={() => {
            setSelectedRecord(null);
            fetchAllInterviewRecords(periodId).then(setRecords);
            onSaved?.();
          }}
        />
      )}
    </div>
  );
}
