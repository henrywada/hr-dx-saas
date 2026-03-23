'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { tenantCreateSchema, tenantUpdateSchema } from '../schemas/tenant.schema';
import type { TenantWithManager, TenantFormData, TenantUpdateData } from '../types';
import { toJSTDateString } from '@/lib/datetime';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate: (data: TenantFormData) => Promise<void>;
  onSubmitUpdate: (data: TenantUpdateData) => Promise<void>;
  editingTenant: TenantWithManager | null;
  loading: boolean;
}

export default function TenantFormDialog({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  editingTenant,
  loading,
}: Props) {
  const isEdit = !!editingTenant;

  // 初期値をメモ化して、propsが変わったときにのみ再計算
  const initialValues = useMemo(() => {
    if (editingTenant) {
      return {
        name: editingTenant.name || '',
        paidAmount: String(editingTenant.paid_amount ?? 0),
        maxEmployees: String(editingTenant.max_employees ?? 30),
        planType: editingTenant.plan_type || 'free',
        contractEndDay: editingTenant.contract_end_at
          ? toJSTDateString(new Date(editingTenant.contract_end_at))
          : '',
        managerEmail: editingTenant.manager_email || '',
        managerName: editingTenant.manager_name || '',
      };
    }
    return {
      name: '',
      paidAmount: '0',
      maxEmployees: '30',
      planType: 'free',
      contractEndDay: '',
      managerEmail: '',
      managerName: '',
    };
  }, [editingTenant]);

  // フォームの状態（初期値から開始）
  const [name, setName] = useState(initialValues.name);
  const [paidAmount, setPaidAmount] = useState(initialValues.paidAmount);
  const [maxEmployees, setMaxEmployees] = useState(initialValues.maxEmployees);
  const [planType, setPlanType] = useState(initialValues.planType);
  const [contractEndDay, setContractEndDay] = useState(initialValues.contractEndDay);
  const [managerEmail, setManagerEmail] = useState(initialValues.managerEmail);
  const [managerName, setManagerName] = useState(initialValues.managerName);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // editingTenantが変更されたらフォームをリセット
  // key prop で再マウントする代わりに、useEffect で同期
  useEffect(() => {
    setName(initialValues.name);
    setPaidAmount(initialValues.paidAmount);
    setMaxEmployees(initialValues.maxEmployees);
    setPlanType(initialValues.planType);
    setContractEndDay(initialValues.contractEndDay);
    setManagerEmail(initialValues.managerEmail);
    setManagerName(initialValues.managerName);
    setErrors({});
  }, [initialValues]);

  // ESCキーで閉じる
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // バリデーション & 送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isEdit) {
      // ===== 更新モード =====
      const parsed = tenantUpdateSchema.safeParse({
        name,
        paid_amount: Number(paidAmount),
        max_employees: Number(maxEmployees),
        plan_type: planType,
        contract_end_day: contractEndDay,
      });

      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          fieldErrors[field] = issue.message;
        });
        setErrors(fieldErrors);
        return;
      }

      await onSubmitUpdate(parsed.data);
    } else {
      // ===== 新規登録モード =====
      const parsed = tenantCreateSchema.safeParse({
        name,
        paid_amount: Number(paidAmount),
        max_employees: Number(maxEmployees),
        plan_type: planType,
        contract_end_day: contractEndDay,
        manager_email: managerEmail,
        manager_name: managerName,
      });

      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          fieldErrors[field] = issue.message;
        });
        setErrors(fieldErrors);
        return;
      }

      await onSubmitCreate(parsed.data);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* ダイアログ本体 */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'テナント情報の編集' : '新規テナント登録'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEdit
                ? 'テナントの基本情報を更新します'
                : 'テナント情報と責任者を登録します'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* テナント名 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              テナント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 株式会社サンプル"
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* プラン */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              プラン <span className="text-red-500">*</span>
            </label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                errors.plan_type ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
              }`}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            {errors.plan_type && (
              <p className="mt-1 text-xs text-red-600">{errors.plan_type}</p>
            )}
          </div>

          {/* 契約終了日（任意） */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              契約終了日
            </label>
            <input
              type="date"
              value={contractEndDay}
              onChange={(e) => setContractEndDay(e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                errors.contract_end_day ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
              }`}
            />
            {errors.contract_end_day && (
              <p className="mt-1 text-xs text-red-600">{errors.contract_end_day}</p>
            )}
            <p className="mt-1.5 text-xs text-gray-400">未入力の場合は期限なしとして扱います。</p>
          </div>

          {/* 金額 & 最高ユーザ数 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                金額（円） <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0"
                min="0"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                  errors.paid_amount ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                }`}
              />
              {errors.paid_amount && (
                <p className="mt-1 text-xs text-red-600">{errors.paid_amount}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                最高ユーザ数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={maxEmployees}
                onChange={(e) => setMaxEmployees(e.target.value)}
                placeholder="30"
                min="1"
                className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                  errors.max_employees ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                }`}
              />
              {errors.max_employees && (
                <p className="mt-1 text-xs text-red-600">{errors.max_employees}</p>
              )}
            </div>
          </div>

          {/* 責任者情報（新規登録のみ表示） */}
          {!isEdit && (
            <>
              <div className="pt-2 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                  <span className="w-1 h-4 bg-blue-500 rounded-full inline-block"></span>
                  責任者情報
                </h3>
              </div>

              {/* 責任者名 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  責任者名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="例: 山田 太郎"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    errors.manager_name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                  }`}
                />
                {errors.manager_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.manager_name}</p>
                )}
              </div>

              {/* 責任者メールアドレス */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  責任者メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="例: manager@example.com"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${
                    errors.manager_email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
                  }`}
                />
                {errors.manager_email && (
                  <p className="mt-1 text-xs text-red-600">{errors.manager_email}</p>
                )}
                <p className="mt-1.5 text-xs text-gray-400">
                  ※ このメールアドレスに招待メール（パスワード設定URL付き）が送信されます。有効期限は1週間です。
                </p>
              </div>
            </>
          )}

          {/* 編集モード時の責任者表示（読み取り専用） */}
          {isEdit && editingTenant && (editingTenant.manager_name || editingTenant.manager_email) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">現在の責任者</h3>
              <p className="text-sm text-gray-700">{editingTenant.manager_name || '未設定'}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">{editingTenant.manager_email || '未設定'}</p>
            </div>
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading
                ? (isEdit ? '更新中...' : '登録中...')
                : (isEdit ? '更新する' : '登録する')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
