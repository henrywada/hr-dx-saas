"use client";

import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { PeriodFormDialog } from './PeriodFormDialog';
import { deleteStressCheckPeriod } from '../actions';
import type { StressCheckPeriod } from '@/features/stress-check/types';

interface MntSetsUIProps {
  tenantId: string;
  periods: StressCheckPeriod[];
}

export function MntSetsUI({ tenantId, periods }: MntSetsUIProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<StressCheckPeriod | null>(null);

  const handleCreate = () => {
    setEditingPeriod(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (p: StressCheckPeriod) => {
    setEditingPeriod(p);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`本当に「${title}」を削除しますか？\n※関連する回答データがある場合は削除できません。`)) {
      const res = await deleteStressCheckPeriod(id);
      if (!res.success) {
        alert(`削除に失敗しました: ${res.error}`);
      }
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">実施中</span>;
      case 'closed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">終了</span>;
      case 'draft':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">準備中</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 border-b-2 border-green-500 pb-2 inline-block">
            実施期間の管理
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            ストレスチェックの実施期間（受検期間）を設定します。
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg shadow-sm hover:from-teal-600 hover:to-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span className="font-semibold text-sm">新規作成</span>
        </button>
      </div>

      <div className="bg-white border text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="px-6 py-4 font-semibold">タイトル</th>
                <th className="px-6 py-4 font-semibold text-center mt-2">対象年度</th>
                <th className="px-6 py-4 font-semibold text-center">質問数</th>
                <th className="px-6 py-4 font-semibold text-center">ステータス</th>
                <th className="px-6 py-4 font-semibold">期間</th>
                <th className="px-6 py-4 font-semibold text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    登録されている実施期間はありません。
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {period.title}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">
                      {period.fiscal_year}年度
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">
                      {period.questionnaire_type}問
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusLabel(period.status)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {period.start_date.split('T')[0]} ～ {period.end_date.split('T')[0]}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(period)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="編集"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(period.id, period.title)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PeriodFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        period={editingPeriod}
        tenantId={tenantId}
      />
    </div>
  );
}
