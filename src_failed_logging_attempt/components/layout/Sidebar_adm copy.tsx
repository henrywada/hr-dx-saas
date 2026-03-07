import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { SidebarNav } from './SidebarNav';

export async function Sidebar() {
  const supabase = await createClient();
  
  // ログインユーザー取得
  const { data: { user } } = await supabase.auth.getUser();
  
  // ※実際の運用では適切な方法でテナントIDを取得してください
  let tenantId = user?.user_metadata?.tenant_id;
  
  if (!tenantId && user) {
     const { data: employee } = await supabase
       .from('employees')
       .select('tenant_id')
       .eq('user_id', user.id)
       .single();
    
     if (employee) {
        tenantId = employee.tenant_id;
     }
  }

  console.log("【Sidebar Debug】 User:", user?.id, "TenantID:", tenantId);

  let dynamicCategories: { id: string; name: string; sort_order: number }[] = [];
  let tenantName = "";

  if (tenantId) {
    // テナント名取得
    const { data: tenant } = await supabase
       .from('tenants')
       .select('name')
       .eq('id', tenantId)
       .single();
    if (tenant) {
       tenantName = tenant.name;
    }

    // 1. serviceで、target_audience='all_users' and release_status='公開'のservice_idを取得
    // ... (rest of logic)
    const { data: tenantServices } = await supabase
      .from('tenant_service')
      .select('service_id')
      .eq('tenant_id', tenantId);
        
    const tenantServiceIds = tenantServices?.map(ts => ts.service_id) || [];

    if (tenantServiceIds.length > 0) {
      // 公開かつ全ユーザー向けのサービスを取得し、かつテナントが契約しているものに絞る
      // 同時にservice_categoryの情報も取得する
      const { data: services } = await supabase
        .from('service')
        .select(`
          id,
          service_category:service_category_id (
            id,
            name,
            sort_order
          )
        `)
        .eq('target_audience', 'all_users')
        .eq('release_status', '公開')
        .in('id', tenantServiceIds);

      if (services) {
        // 取得したデータからカテゴリを一意に抽出してソート
        const categoryMap = new Map<string, { id: string; name: string; sort_order: number }>();

        services.forEach((service: any) => {
          const category = service.service_category;
          if (category && !categoryMap.has(category.id)) {
            categoryMap.set(category.id, category);
          }
        });

        dynamicCategories = Array.from(categoryMap.values()).sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  }

  return (
    <SidebarNav 
      dynamicCategories={dynamicCategories} 
      tenantName={tenantName}
    />
  );
}