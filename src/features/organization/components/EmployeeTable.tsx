"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { Plus, Pencil, Trash2, Search, Users, Filter, Mail } from 'lucide-react';
import type { Division, Employee, AppRole } from '../types';
import { ACTIVE_STATUS_LABELS } from '../types';
import { deleteEmployee, resendEmployeeInviteEmail } from '../actions';
import { EmployeeFormDialog } from './EmployeeFormDialog';

interface EmployeeTableProps {
  employees: Employee[];
  divisions: Division[];
  appRoles: AppRole[];
  tenantId: string;
  employeeCapacity: {
    limit: number;
    registered_user_count: number;
    company_doctor_count: number;
    remaining: number;
  };
}

export function EmployeeTable({ employees, divisions, appRoles, tenantId, employeeCapacity }: EmployeeTableProps) {
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    employee?: Employee;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [resendTarget, setResendTarget] = useState<Employee | null>(null);
  const [resendResult, setResendResult] = useState<{ success: boolean; message: string } | null>(null);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // 検索フィルタ
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          emp.name?.toLowerCase().includes(q) ||
          emp.employee_no?.toLowerCase().includes(q) ||
          emp.job_title?.toLowerCase().includes(q);
        if (!match) return false;
      }
      // 部署フィルタ
      if (filterDivision) {
        if (filterDivision === '__unassigned__') {
          if (emp.division_id) return false;
        } else {
          if (emp.division_id !== filterDivision) return false;
        }
      }
      // ステータスフィルタ
      if (filterStatus && emp.active_status !== filterStatus) return false;
      return true;
    });
  }, [employees, searchQuery, filterDivision, filterStatus]);

  const handleDelete = (employee: Employee) => {
    setDeleteTarget(employee);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      await deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
    });
  };

  const confirmResend = () => {
    if (!resendTarget) return;
    startTransition(async () => {
      const result = await resendEmployeeInviteEmail(resendTarget.id);
      setResendTarget(null);
      setResendResult({
        success: result.success,
        message: result.success
          ? `${resendTarget.name} へ招待メールを再送しました`
          : `送信失敗: ${result.error}`,
      });
      setTimeout(() => setResendResult(null), 4000);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">従業員管理</h1>
          <p className="text-sm text-slate-500 mt-1">従業員情報の一覧・追加・編集ができます</p>
        </div>
        <button
          onClick={() => setDialogState({ open: true })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          従業員を追加
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
          <span>
            最大登録数：<span className="font-semibold text-slate-800">{employeeCapacity.limit}</span>
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>
            登録ユーザ数：<span className="font-semibold text-slate-800">{employeeCapacity.registered_user_count}</span>
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>
            産業医：<span className="font-semibold text-slate-800">{employeeCapacity.company_doctor_count}</span>
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>
            残：
            <span className={`font-semibold ${employeeCapacity.remaining > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {employeeCapacity.remaining}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="氏名・社員番号で検索..."
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterDivision}
              onChange={e => setFilterDivision(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">全部署</option>
              <option value="__unassigned__">未所属</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="">全ステータス</option>
              {Object.entries(ACTIVE_STATUS_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-slate-600">
            従業員一覧
            <span className="text-xs text-slate-400 ml-2">({filteredEmployees.length}名)</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">社員番号</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">氏名</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">性別</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">入社日</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">部署</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">役職</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden lg:table-cell">アプリロール</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">ステータス</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    該当する従業員が見つかりません
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => {
                  const status = ACTIVE_STATUS_LABELS[emp.active_status || ''] || { label: emp.active_status || '---', color: 'bg-slate-100 text-slate-600' };
                  const divisionObj = emp.division as { id: string; name: string | null } | null | undefined;
                  return (
                    <tr key={emp.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.employee_no || '---'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{emp.name || '名前未設定'}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{emp.sex || '---'}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{emp.start_date || '---'}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        {divisionObj?.name || <span className="text-amber-500 text-xs">未所属</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{emp.job_title || '---'}</td>
                      <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                        {emp.app_role?.name || '---'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {/* メール再送ボタン: user_idがある従業員のみ表示 */}
                          {emp.user_id && (
                            <button
                              onClick={() => setResendTarget(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="招待メール再送"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDialogState({ open: true, employee: emp })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="編集"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Form Dialog */}
      <EmployeeFormDialog
        open={dialogState.open}
        onClose={() => setDialogState({ open: false })}
        employee={dialogState.employee}
        divisions={divisions}
        appRoles={appRoles}
        tenantId={tenantId}
      />

      {/* 結果トースト */}
      {resendResult && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          resendResult.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <Mail className="w-4 h-4" />
          {resendResult.message}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">従業員を削除</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-bold">「{deleteTarget.name}」</span>を削除しますか？
                </p>
                <p className="text-xs text-red-600 mt-1">この操作は取り消せません。</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resend Email Confirmation Dialog */}
      {resendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setResendTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                招待メール再送
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <span className="font-bold">「{resendTarget.name}」</span>へ招待メールを再送しますか？
                </p>
                <p className="text-xs text-green-700 mt-1">新しいパスワード設定リンク（有効期限2週間）を送信します。</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setResendTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmResend}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? '送信中...' : '再送する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
