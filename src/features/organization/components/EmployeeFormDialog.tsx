"use client";

import React, { useState, useTransition } from 'react';
import { X } from 'lucide-react';
import type { Division, Employee, AppRole } from '../types';
import { buildDivisionPathMap } from '../types';
import { createEmployee, updateEmployee } from '../actions';

interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  employee?: Employee | null;
  divisions: Division[];
  appRoles: AppRole[];
  tenantId: string;
}

export function EmployeeFormDialog({
  open,
  onClose,
  employee,
  divisions,
  appRoles,
  tenantId,
}: EmployeeFormDialogProps) {
  const isEdit = !!employee;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pathMap = React.useMemo(() => buildDivisionPathMap(divisions), [divisions]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeNo, setEmployeeNo] = useState('');
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState('active');
  const [isManager, setIsManager] = useState(false);
  const [appRoleId, setAppRoleId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [sex, setSex] = useState('');
  const [startDate, setStartDate] = useState('');

  React.useEffect(() => {
    if (open) {
      setError(null);
      setName(employee?.name || '');
      setEmail(employee?.email || '');
      setEmployeeNo(employee?.employee_no || '');
      setDivisionId(employee?.division_id || null);
      setActiveStatus(employee?.active_status || 'active');
      setIsManager(employee?.is_manager || false);
      setAppRoleId(employee?.app_role_id || null);
      setJobTitle(employee?.job_title || '');
      setSex(employee?.sex || '');
      setStartDate(employee?.start_date || '');
    }
  }, [open, employee]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      // 編集時は email を更新対象から除外する（email は auth.users で管理）
      const baseData = {
        name,
        employee_no: employeeNo || undefined,
        division_id: divisionId,
        active_status: activeStatus,
        is_manager: isManager,
        app_role_id: appRoleId,
        job_title: jobTitle || undefined,
        sex: sex || undefined,
        start_date: startDate || undefined,
      };

      const data = isEdit
        ? baseData
        : { ...baseData, email }; // 登録時のみ email を含める

      try {
        let result;
        if (isEdit && employee) {
          result = await updateEmployee(employee.id, data);
        } else {
          result = await createEmployee({ ...data, tenant_id: tenantId });
        }

        if (result.success) {
          onClose();
        } else {
          setError(result.error || '登録に失敗しました。');
        }
      } catch (err: any) {
        setError(err.message || '通信エラーが発生しました。');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? '従業員を編集' : '従業員を追加'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="例：田中太郎"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required={!isEdit} // 編集時はとりあえずオプショナルにするなどの要件変更も可能
                disabled={isEdit} // メールアドレス変更は別フローで行うとした場合
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="例：taro@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">社員番号</label>
              <input
                type="text"
                value={employeeNo}
                onChange={e => setEmployeeNo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="例：E-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">所属部署</label>
              <select
                value={divisionId || ''}
                onChange={e => setDivisionId(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">未所属</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{pathMap.get(d.id) || d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">役職</label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="例：課長"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
              <select
                value={activeStatus}
                onChange={e => setActiveStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="active">アクティブ</option>
                <option value="off">休職</option>
                <option value="secondment">出向</option>
                <option value="doctor">産業医</option>
                <option value="system">システム</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">アプリロール</label>
              <select
                value={appRoleId || ''}
                onChange={e => setAppRoleId(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">未設定</option>
                {appRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.name || r.app_role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">性別</label>
              <select
                value={sex}
                onChange={e => setSex(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="">未設定</option>
                <option value="男性">男性</option>
                <option value="女性">女性</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">入社日</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isManager"
              checked={isManager}
              onChange={e => setIsManager(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isManager" className="text-sm text-slate-700">管理者</label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
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
      </div>
    </div>
  );
}
