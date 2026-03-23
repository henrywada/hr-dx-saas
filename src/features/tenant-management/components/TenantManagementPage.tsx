/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useTenantManagement } from '../hooks/useTenantManagement';
import TenantFormDialog from './TenantFormDialog';
import type { TenantWithManager, TenantFormData, TenantUpdateData } from '../types';
import { Plus, Search, Building2, Mail } from 'lucide-react';
import { formatDateInJST } from '@/lib/datetime';

interface Props {
  initialTenants: TenantWithManager[];
}

export default function TenantManagementPage({ initialTenants }: Props) {
  const { createTenant, updateTenant, deleteTenant, resendInviteEmail } = useTenantManagement();

  const [tenants, setTenants] = useState<TenantWithManager[]>(initialTenants);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ダイアログ制御
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithManager | null>(null);

  useEffect(() => {
    setTenants(initialTenants);
  }, [initialTenants]);

  // 検索フィルタ
  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.manager_name && t.manager_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.manager_email && t.manager_email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ===== 新規登録 =====
  const handleCreate = async (formData: TenantFormData) => {
    setLoading(true);
    try {
      const result = await createTenant(formData);
      if (result.success) {
        setDialogOpen(false);
        // revalidatePathで自動的にprops更新
      } else {
        alert(`登録エラー: ${result.error}`);
      }
    } catch (err: any) {
      alert(`予期せぬエラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== 更新 =====
  const handleUpdate = async (formData: TenantUpdateData) => {
    if (!editingTenant) return;
    setLoading(true);
    try {
      const result = await updateTenant(editingTenant.id, formData);
      if (result.success) {
        setDialogOpen(false);
        setEditingTenant(null);
      } else {
        alert(`更新エラー: ${result.error}`);
      }
    } catch (err: any) {
      alert(`予期せぬエラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== 削除 =====
  const handleDelete = async (tenant: TenantWithManager) => {
    const confirmed = confirm(
      `テナント「${tenant.name}」を削除してもよろしいですか？\n\n⚠️ この操作は取り消せません。\n関連する従業員・サービス設定・ユーザーアカウントもすべて削除されます。`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await deleteTenant(tenant.id);
      if (result.success) {
        // revalidatePathで自動的にprops更新
      } else {
        alert(`削除エラー: ${result.error}`);
      }
    } catch (err: any) {
      alert(`予期せぬエラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== 招待メール再送 =====
  const handleResendEmail = async (tenant: TenantWithManager) => {
    if (!tenant.manager_email && !tenant.manager_user_id) {
      alert('このテナントには責任者のメールアドレスが設定されていません。');
      return;
    }

    const confirmed = confirm(
      `「${tenant.name}」の責任者（${tenant.manager_email || '登録済みアドレス'}）へ\nパスワード設定メールを再送信しますか？\n\n※ 新しい有効期限（1週間）が設定されます。`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await resendInviteEmail(tenant.id, tenant.manager_email);
      if (result.success) {
        alert(`✅ ${tenant.manager_email || '責任者'} へメールを再送しました。`);
      } else {
        alert(`メール再送エラー: ${result.error}`);
      }
    } catch (err: any) {
      alert(`予期せぬエラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== 新規登録ダイアログを開く =====
  const openCreateDialog = () => {
    setEditingTenant(null);
    setDialogOpen(true);
  };

  // ===== 編集ダイアログを開く =====
  const openEditDialog = (tenant: TenantWithManager) => {
    setEditingTenant(tenant);
    setDialogOpen(true);
  };

  // 金額フォーマット
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return `¥${amount.toLocaleString()}`;
  };

  // プランバッジのスタイル
  const getPlanBadge = (planType: string | null) => {
    switch (planType) {
      case 'enterprise':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">Enterprise</span>;
      case 'pro':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">Pro</span>;
      case 'free':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">Free</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500">—</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">契約テナント管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              テナントの新規登録・変更・削除を行います
            </p>
          </div>
        </div>

        <button
          onClick={openCreateDialog}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          新規テナント登録
        </button>
      </div>

      {/* 検索バー */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="テナント名・責任者名・メールで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
        />
      </div>

      {/* 一覧テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  テナント名
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  プラン
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  最高ユーザ数
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  登録ユーザ数
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  産業医
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  責任者名
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  責任者メール
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  契約終了日
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                    {searchQuery
                      ? '検索結果が見つかりませんでした。'
                      : 'テナントが登録されていません。'}
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-semibold text-gray-900">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getPlanBadge(tenant.plan_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-700 font-mono">
                        {formatCurrency(tenant.paid_amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {tenant.max_employees ?? '—'} 名
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-800 tabular-nums">
                        {tenant.registered_user_count} 名
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-800 tabular-nums">
                        {tenant.company_doctor_count} 名
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {tenant.manager_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 font-mono">
                        {tenant.manager_email || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.contract_end_at
                        ? formatDateInJST(tenant.contract_end_at)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => openEditDialog(tenant)}
                          disabled={loading}
                          className="text-blue-500 hover:text-blue-700 text-lg transition-colors disabled:opacity-50"
                          title="編集"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(tenant)}
                          disabled={loading}
                          className="text-red-500 hover:text-red-700 text-lg transition-colors disabled:opacity-50"
                          title="削除"
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => handleResendEmail(tenant)}
                          disabled={loading || !tenant.manager_email}
                          className="text-emerald-500 hover:text-emerald-700 transition-colors disabled:opacity-30"
                          title="招待メール再送"
                        >
                          <Mail className="h-[18px] w-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* フッター: 件数表示 */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            全 {tenants.length} 件中 {filteredTenants.length} 件表示
          </p>
        </div>
      </div>

      {/* 新規登録 / 編集 ダイアログ */}
      {dialogOpen && (
        <TenantFormDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setEditingTenant(null);
          }}
          onSubmitCreate={handleCreate}
          onSubmitUpdate={handleUpdate}
          editingTenant={editingTenant}
          loading={loading}
        />
      )}
    </div>
  );
}
