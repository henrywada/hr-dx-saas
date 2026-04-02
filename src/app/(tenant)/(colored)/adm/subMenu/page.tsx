import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server-user';
import { RouteSegmentLoading } from '@/components/layout/RouteSegmentLoading';
import { SubMenuServiceCard } from '@/components/submenu/SubMenuServiceCard';

export default async function SubMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const categoryId = resolvedSearchParams.service_category_id as string | undefined;

  if (!categoryId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <p>カテゴリーが選択されていません。</p>
        <p className="text-sm mt-2">サイドメニューから項目を選択してください。</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteSegmentLoading />}>
      <AdminSubMenuCategoryContent categoryId={categoryId} />
    </Suspense>
  );
}

async function AdminSubMenuCategoryContent({ categoryId }: { categoryId: string }) {
  const supabase = await createClient();
  const user = await getServerUser();
  const tenantId = user?.tenant_id;

  const { data: category } = await supabase
    .from('service_category')
    .select('name')
    .eq('id', categoryId)
    .single();

  let tenantServiceIds: string[] = [];
  if (tenantId) {
    const { data: tenantServices } = await supabase
      .from('tenant_service')
      .select('service_id')
      .eq('tenant_id', tenantId);
    tenantServiceIds = (tenantServices?.map((ts) => ts.service_id).filter(Boolean) as string[]) ?? [];
  }

  let services = null;
  if (tenantServiceIds.length > 0) {
    const { data } = await supabase
      .from('service')
      .select('*')
      .eq('service_category_id', categoryId)
      .eq('release_status', '公開')
      .in('id', tenantServiceIds)
      .order('sort_order', { ascending: true });
    services = data;

    if (services && services.length > 0) {
      const serviceIds = services.map((s: { id: string }) => s.id);
      const { data: roleServices } = await supabase
        .from('app_role_service')
        .select('service_id, app_role_id')
        .in('service_id', serviceIds);

      const serviceToRoles = new Map<string, Set<string>>();
      for (const rs of roleServices ?? []) {
        if (!rs.service_id || !rs.app_role_id) continue;
        const set = serviceToRoles.get(rs.service_id) ?? new Set();
        set.add(rs.app_role_id);
        serviceToRoles.set(rs.service_id, set);
      }

      const appRole = user?.appRole;
      let userAppRoleId: string | null = null;
      if (appRole) {
        const { data: roleRow } = await supabase
          .from('app_role')
          .select('id')
          .eq('app_role', appRole)
          .single();
        userAppRoleId = roleRow?.id ?? null;
      }

      services = services.filter((s: { id: string }) => {
        const restrictedRoles = serviceToRoles.get(s.id);
        if (!restrictedRoles || restrictedRoles.size === 0) return true;
        return userAppRoleId != null && restrictedRoles.has(userAppRoleId);
      });
    }
  }

  const CARD_VARIANTS = [
    { bar: 'bg-blue-500', text: 'text-blue-600', hover: 'group-hover:text-blue-700' },
    { bar: 'bg-teal-400', text: 'text-teal-600', hover: 'group-hover:text-teal-700' },
    { bar: 'bg-orange-500', text: 'text-orange-600', hover: 'group-hover:text-orange-700' },
    { bar: 'bg-indigo-500', text: 'text-indigo-600', hover: 'group-hover:text-indigo-700' },
    { bar: 'bg-pink-500', text: 'text-pink-600', hover: 'group-hover:text-pink-700' },
    { bar: 'bg-green-500', text: 'text-green-600', hover: 'group-hover:text-green-700' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
      <div className="relative pl-5">
        <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {category?.name || '未設定のカテゴリ'}
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium pl-0.5">関連する業務アプリケーション一覧</p>
      </div>

      {!services || services.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">利用可能なサービスがありません。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => {
            const variant = CARD_VARIANTS[index % CARD_VARIANTS.length];
            let targetPath = service.route_path || '#';
            if (targetPath !== '#') {
              if (!targetPath.startsWith('/')) {
                targetPath = '/' + targetPath;
              }
              if (
                !targetPath.startsWith('/adm/') &&
                !targetPath.startsWith('/device-pairing')
              ) {
                targetPath = '/adm' + targetPath;
              }
            }

            return (
              <SubMenuServiceCard
                key={service.id}
                href={targetPath}
                variant={variant}
                layout="admin"
                title={service.title}
                name={service.name}
                description={service.description}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
