/** テナントの契約プラン種別 */
export type PlanType = 'free' | 'pro' | 'enterprise';

export interface AppUser {
  id: string;
  email?: string;
  name: string;
  role: string;
  appRole?: string;
  appRoleName?: string;
  tenant_id?: string;
  tenant_name?: string;
  /** テナントの契約プラン (free / pro / enterprise) */
  planType?: PlanType;
  /** テナントの従業員登録上限数 */
  maxEmployees?: number;
  /** employees.id（ログインユーザーに紐づく従業員ID） */
  employee_id?: string;
  /** employees.division_id（所属部署ID。未配属はnull、従業員レコードなしはundefined） */
  division_id?: string | null;
  /** employees.employee_no（端末登録などで使用） */
  employee_no?: string | null;
}

export interface AuthSession {
  user: AppUser;
  expires?: string;
}