import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getEmployees, getDivisions, getAppRoles } from '@/features/organization/queries';
import { EmployeeTable } from '@/features/organization/components/EmployeeTable';

export default async function EmployeesPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  const [employees, divisions, appRoles] = await Promise.all([
    getEmployees(),
    getDivisions(),
    getAppRoles(),
  ]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <EmployeeTable
        employees={employees}
        divisions={divisions}
        appRoles={appRoles}
        tenantId={user.tenant_id}
      />
    </div>
  );
}
