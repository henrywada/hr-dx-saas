// src/features/tenant-management/types.ts

import type { TenantCreateValues, TenantUpdateValues } from './schemas/tenant.schema';

/** tenants テーブルの行型 */
export type Tenant = {
  id: string;
  name: string;
  contact_date: string | null;
  paid_amount: number | null;
  /** 契約上の枠など（別用途） */
  employee_count: number | null;
  /** 従業員登録上限（DB: tenants.max_employees） */
  max_employees: number | null;
  paied_date: string | null;
  plan_type: string | null;
  /** 契約終了日時（NULL は未設定） */
  contract_end_at: string | null;
  created_at: string;
};

/** テナント一覧表示用（管理者情報を結合した型） */
export type TenantWithManager = Tenant & {
  manager_name: string | null;
  manager_email: string | null;
  manager_user_id: string | null;
  /** app_role <> 'company_doctor' の従業員数（ロール未設定も含む） */
  registered_user_count: number;
  /** app_role = 'company_doctor' の従業員数 */
  company_doctor_count: number;
};

/** 新規登録フォーム用（Zod 出力型と一致） */
export type TenantFormData = TenantCreateValues;

/** 更新フォーム用 */
export type TenantUpdateData = TenantUpdateValues;

/** Server Action 結果 */
export type TenantActionResult = {
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};
