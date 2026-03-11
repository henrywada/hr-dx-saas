import { getAllTenants } from '@/features/tenant-management/queries';
import TenantManagementPage from '@/features/tenant-management/components/TenantManagementPage';

export default async function TenantsPage() {
  // サーバーサイドで全テナントデータを取得（SC: APIルート不使用）
  const tenants = await getAllTenants();

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <TenantManagementPage initialTenants={tenants} />
      </div>
    </main>
  );
}
