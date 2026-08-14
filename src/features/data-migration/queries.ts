import { getAllTenants } from '@/features/tenant-management/queries'
import type { MigrationTenantOption } from './types'

/** SaaS 管理者向け: 移行先テナント一覧 */
export async function getMigrationTenants(): Promise<MigrationTenantOption[]> {
  const tenants = await getAllTenants()
  return tenants.map(t => ({
    id: t.id,
    name: t.name,
    max_employees: t.max_employees,
    registered_user_count: t.registered_user_count,
  }))
}
