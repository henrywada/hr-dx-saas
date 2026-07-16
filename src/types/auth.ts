/** テナントの契約プラン種別 */
export type PlanType = 'free' | 'plan100' | 'plan300' | 'plan500' | 'plan1000'

/** 有料プランの許可リスト（フェイルクローズ判定のため明示列挙する） */
const PAID_PLANS: ReadonlySet<string> = new Set(['plan100', 'plan300', 'plan500', 'plan1000'])

/** 有料プランかどうかの判定。有料機能のゲーティングはこの関数に集約する（想定外の値は無料扱い） */
export function isPaidPlan(planType?: PlanType): boolean {
  return planType !== undefined && PAID_PLANS.has(planType)
}

export interface AppUser {
  id: string
  email?: string
  name: string
  role: string
  appRole?: string
  appRoleName?: string
  tenant_id?: string
  tenant_name?: string
  /** テナントの契約プラン (free / plan100 / plan300 / plan500 / plan1000) */
  planType?: PlanType
  /** テナントの従業員登録上限数 */
  maxEmployees?: number
  /** employees.id（ログインユーザーに紐づく従業員ID） */
  employee_id?: string
  /** employees.division_id（所属部署ID。未配属はnull、従業員レコードなしはundefined） */
  division_id?: string | null
  /** employees.is_manager（上長・承認者フラグ） */
  is_manager?: boolean | null
  /** employees.employee_no（端末登録などで使用） */
  employee_no?: string | null
}

export interface AuthSession {
  user: AppUser
  expires?: string
}
