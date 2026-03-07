import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { SidebarNav } from './SidebarNav';
import { getServerUser } from '@/lib/auth/server-user';
import { APP_ROUTES } from '@/config/routes';

export async function AppSidebar({ variant }: { variant: 'portal' | 'admin' | 'saas' }) {
  const supabase = await createClient();
  const user = await getServerUser();

  const tenantId = user?.tenant_id;
  const userName = user?.name || "";
  const tenantName = variant === 'saas' ? "SaaS管理" : (user?.tenant_name || "");

  let dynamicCategories: { id: string; name: string; sort_order: number }[] = [];

  if (variant === 'saas') {
    const { data: services } = await supabase
      .from('service')
      .select(`id, service_category:service_category_id(id, name, sort_order)`)
      .eq('target_audience', 'saas_adm');

    if (services) {
      const categoryMap = new Map<string, { id: string; name: string; sort_order: number }>();
      services.forEach((service: { service_category: unknown }) => {
        const category = service.service_category as { id: string; name: string; sort_order: number } | null | undefined;
        if (category && !categoryMap.has(category.id)) {
          categoryMap.set(category.id, category);
        }
      });
      dynamicCategories = Array.from(categoryMap.values()).sort((a, b) => a.sort_order - b.sort_order);
    }
  } else if (tenantId) {
    // テナントが契約しているサービスIDを取得
    const { data: tenantServices } = await supabase
      .from('tenant_service')
      .select('service_id')
      .eq('tenant_id', tenantId);
        
    const tenantServiceIds = tenantServices?.map(ts => ts.service_id) || [];

    if (tenantServiceIds.length > 0) {
      // admin: target_audience='adm' のサービスを取得
      // portal: target_audience='all_users' のサービスを取得
      const targetAudience = variant === 'admin' ? 'adm' : 'all_users';

      const { data: services } = await supabase
        .from('service')
        .select(`id, service_category:service_category_id(id, name, sort_order)`)
        .eq('target_audience', targetAudience)
        .eq('release_status', '公開')
        .in('id', tenantServiceIds);

      if (services) {
        const categoryMap = new Map<string, { id: string; name: string; sort_order: number }>();
        services.forEach((service: { service_category: unknown }) => {
          const category = service.service_category as { id: string; name: string; sort_order: number } | null | undefined;
          if (category && !categoryMap.has(category.id)) {
            categoryMap.set(category.id, category);
          }
        });
        dynamicCategories = Array.from(categoryMap.values()).sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  }

  const basePath = variant === 'saas' ? `${APP_ROUTES.SAAS.DASHBOARD}/subMenu` : (variant === 'admin' ? `${APP_ROUTES.TENANT.ADMIN}/subMenu` : undefined);
  const isSaaSAdmin = variant === 'saas' || variant === 'admin';

  return (
    <SidebarNav 
      dynamicCategories={dynamicCategories} 
      tenantName={tenantName}
      basePath={basePath}
      userName={variant !== 'portal' ? userName : undefined}
      isSaaSAdmin={isSaaSAdmin}
    />
  );
}
