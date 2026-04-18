'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { assignEmployees } from '../actions';
import type { QuestionnaireListItem } from '../types';
import { createClient } from '@/lib/supabase/client';

interface Employee {
  id: string;
  name: string;
  employee_no: string | null;
}

interface Props {
  questionnaire: QuestionnaireListItem;
  tenantId: string;
  onClose: () => void;
  periodId?: string | null;
}

export default function AssignmentModal({ questionnaire, tenantId, onClose, periodId }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hrMessage, setHrMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      // 従業員一覧取得
      const { data: empData } = await db
        .from('employees')
        .select('id, name, employee_no')
        .eq('tenant_id', tenantId)
        .order('name');

      setEmployees(empData ?? []);

      // 既存アサイン取得（period_id でフィルタ）
      let assignQuery = db
        .from('questionnaire_assignments')
        .select('employee_id')
        .eq('questionnaire_id', questionnaire.id)

      if (periodId) {
        assignQuery = assignQuery.eq('period_id', periodId)
        // 既存の人事メッセージを取得
        const { data: periodData } = await db
          .from('questionnaire_periods')
          .select('hr_message')
          .eq('id', periodId)
          .single()
        if (periodData?.hr_message) setHrMessage(periodData.hr_message)
      } else {
        assignQuery = assignQuery.is('period_id', null)
      }

      const { data: assigned } = await assignQuery

      const assignedIds = new Set<string>(
        (assigned ?? []).map((a: { employee_id: string }) => a.employee_id)
      );
      setSelectedIds(assignedIds);
      setLoading(false);
    }
    load();
  }, [questionnaire.id, tenantId]);

  function toggleEmployee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(employees.map((e) => e.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  function handleSubmit() {
    if (selectedIds.size === 0) {
      setError('1名以上の従業員を選択してください。');
      return;
    }
    setError('');
    startTransition(async () => {
      const res = await assignEmployees(
        questionnaire.id,
        Array.from(selectedIds),
        null,
        periodId ?? null,
        hrMessage.trim() || null
      );
      if (res.success) {
        onClose();
      } else {
        setError(res.error ?? 'アサインに失敗しました。');
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-neutral-800">従業員アサイン</h2>
            <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">
              {questionnaire.title}
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          {/* 人事メッセージ */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              人事メッセージ（任意）
            </label>
            <textarea
              value={hrMessage}
              onChange={(e) => setHrMessage(e.target.value)}
              placeholder="従業員に表示するメッセージを入力してください"
              rows={3}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* 従業員リスト */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-700">
                対象従業員（{selectedIds.size} / {employees.length}名選択）
              </label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-primary hover:underline">全選択</button>
                <button onClick={clearAll} className="text-xs text-neutral-400 hover:underline">クリア</button>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-sm text-neutral-400">読み込み中...</div>
            ) : employees.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-400">従業員が見つかりません。</div>
            ) : (
              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 max-h-64 overflow-y-auto">
                {employees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-neutral-800">{emp.name}</span>
                    {emp.employee_no && (
                      <span className="text-xs text-neutral-400">{emp.employee_no}</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 flex-shrink-0">
          <Button variant="outline" size="md" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={isPending || loading}>
            {isPending ? '保存中...' : 'アサインを保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
