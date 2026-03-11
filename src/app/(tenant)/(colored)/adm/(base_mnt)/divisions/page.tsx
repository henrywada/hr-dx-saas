import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getDivisions, getEmployeesByDivision, getUnassignedEmployees } from '@/features/organization/queries';
import { DivisionTree } from '@/features/organization/components/DivisionTree';

export default async function DivisionsPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  const [divisions, employees, unassignedEmployees] = await Promise.all([
    getDivisions(),
    getEmployeesByDivision(),
    getUnassignedEmployees(),
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <DivisionTree
        divisions={divisions}
        employees={employees}
        unassignedEmployees={unassignedEmployees}
        tenantId={user.tenant_id}
      />
    </div>
  );
}
