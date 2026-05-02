'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, Users } from 'lucide-react';
import { fetchNotSubmittedEmployees } from '../actions';
import type { NotSubmittedEmployee } from '../types';

interface NotSubmittedListModalProps {
  open: boolean;
  onClose: () => void;
  periodId: string;
  establishmentId?: string;
  title?: string;
}

export default function NotSubmittedListModal({
  open,
  onClose,
  periodId,
  establishmentId,
  title,
}: NotSubmittedListModalProps) {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<NotSubmittedEmployee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState('');

  useEffect(() => {
    if (!open || !periodId) return;
    let cancelled = false;

    Promise.resolve()
      .then(async () => {
        if (cancelled) return null;
        setError(null);
        setLoading(true);
        setEmployees([]);
        return fetchNotSubmittedEmployees(periodId, establishmentId);
      })
      .then((result) => {
        if (cancelled || !result) return;
        if (result.success) {
          setEmployees(result.data);
        } else {
          setError('error' in result ? result.error : '取得に失敗しました');
          setEmployees([]);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '取得に失敗しました');
        setEmployees([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, periodId, establishmentId]);

  const divisions = useMemo(() => {
    const names = [...new Set(employees.map((e) => e.division_name).filter(Boolean))] as string[];
    return names.sort((a, b) => (a || '').localeCompare(b || '', 'ja'));
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          (e.name?.toLowerCase().includes(q) ?? false) ||
          (e.employee_no?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      if (filterDivision && e.division_name !== filterDivision) return false;
      return true;
    });
  }, [employees, searchQuery, filterDivision]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            {title ?? '未受検者一覧'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="氏名・社員番号で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="">部署で絞り込み</option>
              {divisions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium">未受検者はおりません</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    氏名
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    社員番号
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    部署
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    役職
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {emp.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {emp.employee_no || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {emp.division_name || '未配属'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {emp.job_title || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 shrink-0">
          {!loading && !error && filtered.length > 0 && (
            <span>
              {filtered.length !== employees.length
                ? `${filtered.length} 名 / 全 ${employees.length} 名`
                : `全 ${filtered.length} 名`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
