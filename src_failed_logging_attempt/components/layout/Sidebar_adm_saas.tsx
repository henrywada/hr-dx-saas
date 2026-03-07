import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { SidebarNav } from './SidebarNav';

export async function Sidebar() {
  const supabase = await createClient();

  // ログインユーザー名取得
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.user_metadata?.name || "";

  // 1. serviceで、target_audience='saas_adm' のservice_category_idを取得
  // ... (rest of logic)
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
    .eq('target_audience', 'saas_adm');

  let dynamicCategories: { id: string; name: string; sort_order: number }[] = [];

  if (services) {
    // 2. service_categoryをsort_order順に並べ、メニューを作成する
    const categoryMap = new Map<string, { id: string; name: string; sort_order: number }>();

    services.forEach((service: any) => {
      const category = service.service_category;
      if (category && !categoryMap.has(category.id)) {
        categoryMap.set(category.id, category);
      }
    });

    dynamicCategories = Array.from(categoryMap.values()).sort((a, b) => a.sort_order - b.sort_order);
  }

  return (
    <SidebarNav 
      dynamicCategories={dynamicCategories} 
      tenantName="SaaS管理" 
      isSaaSAdmin={true}
      basePath="/saas_adm/subMenu"
      userName={userName}
    />
  );
}