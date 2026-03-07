import React from 'react';
import DashboardUI from '@/features/saas-dashboard/components/DashboardUI';
import { getSaasStats, getSaasTenants, getSaasActivity, getAccessCountByTenant } from '@/features/saas-dashboard/queries';

// 常に最新のデータを取得するため、Next.jsの静的キャッシュを無効化する
export const dynamic = 'force-dynamic';
export const revalidate = 0; // 追加: 完全キャッシュ無効化

export default async function DashboardPage() {
  // サーバーサイドで直接Supabaseを叩き、データを取得
  const [stats, tenants, activityData, accessCounts] = await Promise.all([
    getSaasStats(),
    getSaasTenants(),
    getSaasActivity(),
    getAccessCountByTenant(),
  ]);

  // テナントデータにアクセス数を付与
  const tenantsWithAccess = tenants.map(t => ({
    ...t,
    accessCount: accessCounts.get(t.id) || 0,
  }));

  // 取ってきたデータをただClient Componentに渡すだけ
  return <DashboardUI stats={stats} tenants={tenantsWithAccess} activityData={activityData} />;
}