import { getAllTenants, getSaasEmployees } from '@/features/tenant-management/queries'
import SaasTenantsTabPage from '@/features/tenant-management/components/SaasTenantsTabPage'

export default async function TenantsPage() {
  const [tenants, employees] = await Promise.all([getAllTenants(), getSaasEmployees()])

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <SaasTenantsTabPage initialTenants={tenants} employees={employees} />
      </div>
    </main>
  )
}
