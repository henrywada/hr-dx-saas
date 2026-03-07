import { getServiceCategories, getServices, getAppRoles, getTenants } from '@/features/system-master/queries';
import { getAppRoleServices, getTenantServices } from '@/features/system-master/actions';
import SystemMasterTabs from '@/features/system-master/components/SystemMasterTabs';

export default async function SystemMasterPage() {
  // サーバーサイド(SC)で並列に全データを取得 (APIルート不使用)
  const [categories, services, roles, roleServices, tenants, tenantServices] = await Promise.all([
    getServiceCategories(),
    getServices(),
    getAppRoles(),
    getAppRoleServices(),
    getTenants(),
    getTenantServices()
  ]);

  return (
    // flex-1 w-full を指定し、親のコンテナいっぱいに広がるようにします
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        <div className="w-full bg-white">
          <SystemMasterTabs 
            initialCategories={categories}
            initialServices={services}
            initialRoles={roles}
            initialRoleServices={roleServices}
            initialTenants={tenants}
            initialTenantServices={tenantServices}
          />
        </div>
      </div>
    </main>
  );
}
