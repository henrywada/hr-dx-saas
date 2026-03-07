// src/features/tenant-management/types.ts

/** tenants テーブルの行型 */
export type Tenant = {
  id: string;
  name: string;
  contact_date: string | null;
  paid_amount: number | null;
  employee_count: number | null;
  paied_date: string | null;
  plan_type: string | null;
  created_at: string;
};

/** テナント一覧表示用（管理者情報を結合した型） */
export type TenantWithManager = Tenant & {
  manager_name: string | null;
  manager_email: string | null;
};

/** 新規登録フォーム用 */
export type TenantFormData = {
  name: string;
  paid_amount: number;
  employee_count: number;
  plan_type: string;
  manager_email: string;
  manager_name: string;
};

/** 更新フォーム用 */
export type TenantUpdateData = {
  name: string;
  paid_amount: number;
  employee_count: number;
  plan_type: string;
};

/** Server Action 結果 */
export type TenantActionResult = {
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};
