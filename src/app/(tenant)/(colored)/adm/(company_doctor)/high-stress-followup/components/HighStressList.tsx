'use client';

import type { HighStressListItem } from '@/features/adm/high-stress-followup/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  items: HighStressListItem[];
  selectedId: string | null;
  onSelect: (item: HighStressListItem) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  filterDivision?: string;
  onFilterDivisionChange?: (v: string) => void;
  uncompletedOnly?: boolean;
  onUncompletedOnlyChange?: (v: boolean) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: '未実施', className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: '予約済', className: 'bg-blue-100 text-blue-700' },
  completed: { label: '完了', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'キャンセル', className: 'bg-rose-100 text-rose-700' },
};

function getStatusBadge(item: HighStressListItem) {
  if (item.hasMeasureDecided) {
    return { label: '措置決定済', className: 'bg-violet-100 text-violet-700' };
  }
  return STATUS_CONFIG[item.latestStatus] ?? STATUS_CONFIG.pending;
}

export function HighStressList({
  items,
  selectedId,
  onSelect,
  searchQuery = '',
  onSearchChange,
  filterDivision,
  onFilterDivisionChange,
  uncompletedOnly = false,
  onUncompletedOnlyChange,
}: Props) {
  const divisions = [...new Set(items.map((i) => i.divisionAnonymousLabel))].sort();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 space-y-3">
        {onSearchChange && (
          <input
            type="text"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-sm rounded-lg border border-slate-200 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        )}
        <div className="flex flex-wrap gap-2">
          {onFilterDivisionChange && (
            <select
              value={filterDivision ?? ''}
              onChange={(e) => onFilterDivisionChange(e.target.value || '')}
              className="text-xs rounded-lg border border-slate-200 py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
            >
              <option value="">部署（匿名）</option>
              {divisions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          {onUncompletedOnlyChange && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={uncompletedOnly}
                onChange={(e) => onUncompletedOnlyChange(e.target.checked)}
                className="rounded border-slate-300"
              />
              面接未実施のみ
            </label>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">判定日</th>
              <th className="px-4 py-3 font-semibold">主な要因</th>
              <th className="px-4 py-3 font-semibold">状況</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  対象者はいません
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const badge = getStatusBadge(item);
                const isSelected = selectedId === item.stressResultId;
                return (
                  <tr
                    key={item.stressResultId}
                    onClick={() => onSelect(item)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {item.anonymousId}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {item.calculatedAt
                        ? format(new Date(item.calculatedAt), 'M/d', { locale: ja })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[120px] truncate">
                      {item.highStressReason || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
        件数: {items.length}名
      </div>
    </div>
  );
}
