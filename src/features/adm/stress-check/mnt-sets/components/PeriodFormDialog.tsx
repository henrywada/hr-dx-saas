"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { X } from 'lucide-react';
import { createStressCheckPeriod, updateStressCheckPeriod } from '../actions';
import type { StressCheckPeriod, QuestionnaireType, PeriodStatus } from '@/features/stress-check/types';

interface PeriodFormDialogProps {
  open: boolean;
  onClose: () => void;
  period?: StressCheckPeriod | null;
  tenantId: string;
  /** 新規作成時のみ必須（拠点マスタの id） */
  divisionEstablishmentId?: string | null;
}

export function PeriodFormDialog({
  open,
  onClose,
  period,
  tenantId,
  divisionEstablishmentId = null,
}: PeriodFormDialogProps) {
  const isEdit = !!period;
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [qType, setQType] = useState<QuestionnaireType>('57');
  const [status, setStatus] = useState<PeriodStatus>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (open) {
      setTitle(period?.title || '');
      setQType(period?.questionnaire_type || '57');
      setStatus(period?.status || 'draft');
      setStartDate((period?.start_date || '').split('T')[0] || '');
      setEndDate((period?.end_date || '').split('T')[0] || '');
      setFiscalYear(period?.fiscal_year || new Date().getFullYear());
    }
  }, [open, period]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const data = {
        title,
        questionnaire_type: qType,
        status,
        start_date: startDate,
        end_date: endDate,
        fiscal_year: fiscalYear,
      };

      if (isEdit && period) {
        const res = await updateStressCheckPeriod(period.id, data);
        if (!res.success) {
          alert(res.error ?? '更新に失敗しました');
          return;
        }
      } else {
        if (!divisionEstablishmentId) {
          alert('拠点が特定できません。拠点を保存してから実施期間を追加してください。');
          return;
        }
        const res = await createStressCheckPeriod({
          ...data,
          tenant_id: tenantId,
          division_establishment_id: divisionEstablishmentId,
        });
        if (!res.success) {
          alert(res.error ?? '登録に失敗しました');
          return;
        }
      }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? '実施期間を編集' : '実施期間を追加'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="例：2026年度 ストレスチェック"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">対象年度</label>
              <input
                type="number"
                value={fiscalYear}
                onChange={e => setFiscalYear(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">質問数</label>
              <select
                value={qType}
                onChange={e => setQType(e.target.value as QuestionnaireType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="57">57問</option>
                <option value="23">23問</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">開始日 <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
             </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">終了日 <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as PeriodStatus)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">準備中 (Draft)</option>
              <option value="active">実施中 (Active)</option>
              <option value="closed">終了 (Closed)</option>
            </select>
            {status === 'active' && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                ※「実施中」は拠点ごとに同時に1件までです（DBで一意制約）。テナント全体の旧データは拠点未設定のまま運用できます。
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim() || !startDate || !endDate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
