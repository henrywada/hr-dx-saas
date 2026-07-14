import {
  getServiceClasses,
  getServiceClassIndex,
  getServiceCategories,
  getServices,
  getAppRoles,
  getTenants,
} from '@/features/system-master/queries'
import { getAppRoleServices, getTenantServices } from '@/features/system-master/actions'
import {
  getAllUiDashboardElements,
  getAllTenantUiDashboardElements,
} from '@/features/dashboard-ui-visibility/actions'
import SystemMasterTabs from '@/features/system-master/components/SystemMasterTabs'

export default async function SystemMasterPage() {
  const [
    classes,
    classIndex,
    categories,
    services,
    roles,
    roleServices,
    tenants,
    tenantServices,
    uiDashboardElements,
    tenantUiDashboardElements,
  ] = await Promise.all([
    getServiceClasses(),
    getServiceClassIndex(),
    getServiceCategories(),
    getServices(),
    getAppRoles(),
    getAppRoleServices(),
    getTenants(),
    getTenantServices(),
    getAllUiDashboardElements().catch(() => []),
    getAllTenantUiDashboardElements().catch(() => []),
  ])

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full">
        <div className="w-full bg-white">
          <SystemMasterTabs
            initialClasses={classes}
            initialClassIndex={classIndex}
            initialCategories={categories}
            initialServices={services}
            initialRoles={roles}
            initialRoleServices={roleServices}
            initialTenants={tenants}
            initialTenantServices={tenantServices}
            initialUiDashboardElements={uiDashboardElements}
            initialTenantUiDashboardElements={tenantUiDashboardElements}
          />
        </div>
      </div>
    </main>
  )
}
