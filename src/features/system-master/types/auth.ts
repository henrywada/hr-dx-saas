export interface AuthUser {
  id: string
  email: string
  created_at: string
}

export interface Employee {
  id: string
  tenant_id: string
  division_id: string | null
  active_status: string | null
  name: string | null
  is_manager: boolean | null
  app_role_id: string | null
  employee_no: string | null
  job_title: string | null
  sex: string | null
  start_date: string | null
  is_contacted_person: boolean | null
  contacted_date: string | null
  user_id: string | null
}

export interface Tenant {
  id: string
  name: string | null
  contact_date: string | null
  paid_amount: number | null
  employee_count: number | null
  paid_date: string | null
  created_at: string | null
}

export interface AppRole {
  id: string
  name: string | null
  description: string | null
  sort_order: number | null
}

export interface AuthSession {
  user: AuthUser
  employee: Employee
  tenant: Tenant
  appRole: AppRole | null
}