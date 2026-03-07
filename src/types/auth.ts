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
}

export interface AuthSession {
  user: AppUser;
  expires?: string;
}