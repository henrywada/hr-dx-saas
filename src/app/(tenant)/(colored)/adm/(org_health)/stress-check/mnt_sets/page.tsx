import React from 'react';
import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { MntSetsUI } from '@/features/adm/stress-check/mnt-sets/components/MntSetsUI';
import { getStressCheckPeriodsList } from '@/features/adm/stress-check/mnt-sets/queries';
import { APP_ROUTES } from '@/config/routes';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '実施期間管理 - ストレスチェック',
};

export default async function StressCheckMntSetsPage() {
  const user = await getServerUser();

  if (!user || !user.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  const periods = await getStressCheckPeriodsList(user.tenant_id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <MntSetsUI tenantId={user.tenant_id} periods={periods} />
    </div>
  );
}
