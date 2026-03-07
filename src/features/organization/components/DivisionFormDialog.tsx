"use client";

import React, { useState, useTransition } from 'react';
import { X } from 'lucide-react';
import type { Division } from '../types';
import { buildDivisionPathMap } from '../types';
import { createDivision, updateDivision, deleteDivision } from '../actions';

interface DivisionFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'delete';
  division?: Division | null;
  parentDivision?: Division | null;
  allDivisions: Division[];
  tenantId: string;
}

export function DivisionFormDialog({
  open,
  onClose,
  mode,
  division,
  parentDivision,
  allDivisions,
  tenantId,
}: DivisionFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const pathMap = React.useMemo(() => buildDivisionPathMap(allDivisions), [allDivisions]);
  const [name, setName] = useState(division?.name || '');
  const [code, setCode] = useState(division?.code || '');
  const [layer, setLayer] = useState(division?.layer || (parentDivision ? (parentDivision.layer || 0) + 1 : 1));
  const [parentId, setParentId] = useState<string | null>(
    mode === 'create' ? (parentDivision?.id || null) : (division?.parent_id || null)
  );

  React.useEffect(() => {
    if (open) {
      setName(division?.name || '');
      setCode(division?.code || '');
      setLayer(division?.layer || (parentDivision ? (parentDivision.layer || 0) + 1 : 1));
      setParentId(
        mode === 'create' ? (parentDivision?.id || null) : (division?.parent_id || null)
      );
    }
  }, [open, division, parentDivision, mode]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (mode === 'create') {
        await createDivision({
          name,
          code: code || undefined,
          layer,
          parent_id: parentId,
          tenant_id: tenantId,
        });
      } else if (mode === 'edit' && division) {
        await updateDivision(division.id, {
          name,
          code: code || undefined,
          layer,
          parent_id: parentId,
        });
      }
      onClose();
    });
  };

  const handleDelete = () => {
    if (!division) return;
    startTransition(async () => {
      await deleteDivision(division.id);
      onClose();
    });
  };

  const title = mode === 'create'
    ? '部署を追加'
    : mode === 'edit'
    ? '部署を編集'
    : '部署を削除';

  // 親部署の選択肢から、自分自身と子孫を除外
  const availableParents = mode === 'edit' && division
    ? allDivisions.filter(d => d.id !== division.id)
    : allDivisions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'delete' ? (
          <div className="p-6 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <span className="font-bold">「{division?.name}」</span>を削除しますか？
              </p>
              <p className="text-xs text-red-600 mt-2">
                所属する従業員は「未所属」に変更されます。子部署がある場合は先に移動してください。
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">部署名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="例：東京事務所"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">コード</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="例：TKY-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">階層（レイヤー）</label>
              <input
                type="number"
                value={layer}
                onChange={e => setLayer(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">親部署</label>
              <select
                value={parentId || ''}
                onChange={e => setParentId(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="">なし（ルート）</option>
                {availableParents.map(d => (
                  <option key={d.id} value={d.id}>
                    {pathMap.get(d.id) || d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
