'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * SaaS管理ダッシュボード用: 全体の統計情報を取得する (RLSバイパス)
 */
export async function getSaasStats() {
  try {
    const supabase = createAdminClient();

    // 1. テナント数
    const { count: tenantCount } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    // 2. 登録ユーザ数
    const { count: userCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    // 3. 公開サービス数
    const { count: publishedServiceCount } = await supabase
      .from('service')
      .select('*', { count: 'exact', head: true })
      .eq('release_status', '公開');
      
    // 4. 未公開サービス数
    const { count: unpublishedServiceCount } = await supabase
      .from('service')
      .select('*', { count: 'exact', head: true })
      .eq('release_status', '未公開');

    return {
      tenantCount: tenantCount ?? 0,
      userCount: userCount ?? 0,
      publishedServiceCount: publishedServiceCount ?? 0,
      unpublishedServiceCount: unpublishedServiceCount ?? 0,
    };
  } catch (error) {
    console.error('getSaasStats Error:', error);
    return { tenantCount: 0, userCount: 0, publishedServiceCount: 0, unpublishedServiceCount: 0 };
  }
}

/**
 * SaaS管理ダッシュボード用: 各テナントの契約・登録状況を取得する (RLSバイパス)
 */
export async function getSaasTenants() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        employee_count,
        employees:employees(count)
      `);

    if (error) throw error;

    type TenantRow = {
      id: string;
      name: string;
      employee_count: number | null;
      employees: { count: number }[];
    };

    return (data as unknown as TenantRow[]).map((t) => ({
      id: t.id,
      name: t.name,
      contract_limit: t.employee_count ?? 0,
      actual_count: t.employees?.[0]?.count ?? 0
    }));
  } catch (error) {
    console.error('getSaasTenants Error:', error);
    return [];
  }
}

/**
 * SaaS管理ダッシュボード用: アクティビティログを取得する
 */
export async function getSaasActivity() {
  try {
    const supabase = createAdminClient();
    
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 14);
    const startDateString = pastDate.toISOString().split('T')[0];

    const countsMap = new Map<string, number>();
    
    // 過去14日分のカレンダー（0件）を用意して時系列を整える (ローカルタイムゾーンを使用)
    const sortedDates = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      const key = `${mm}/${dd}`;
      countsMap.set(key, 0);
      sortedDates.push(key);
    }

    // APIの1リクエストあたり最大件数（通常1000件）があるため、ループで取得する
    let hasMore = true;
    let offset = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from('access_logs')
        .select('created_at')
        .gte('created_at', startDateString)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
        
      if (error) {
        console.error('getSaasActivity API Error:', error);
        break;
      }
      
      if (data && data.length > 0) {
        data.forEach(log => {
          const d = new Date(log.created_at);
          const mm = (d.getMonth() + 1).toString().padStart(2, '0');
          const dd = d.getDate().toString().padStart(2, '0');
          const key = `${mm}/${dd}`;
          
          if (countsMap.has(key)) {
            countsMap.set(key, countsMap.get(key)! + 1);
          }
        });
        
        offset += PAGE_SIZE;
        // データがPAGE_SIZE未満なら次はない
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      
      // 安全のため10ページ（最大1万件）で制限
      if (offset >= 10000) {
        hasMore = false;
      }
    }

    return sortedDates.map(dateKey => ({
      date: dateKey,
      value: countsMap.get(dateKey) || 0,
    }));
    
  } catch (error) {
    console.error('getSaasActivity Error:', error);
    return [];
  }
}

/**
 * SaaS管理ダッシュボード用: テナント別の直近2週間アクセス数を集計する
 */
export async function getAccessCountByTenant(): Promise<Map<string, number>> {
  try {
    const supabase = createAdminClient();

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 14);
    const startDateString = pastDate.toISOString().split('T')[0];

    const countMap = new Map<string, number>();
    let hasMore = true;
    let offset = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
      const { data, error } = await supabase
        .from('access_logs')
        .select('tenant_id')
        .gte('created_at', startDateString)
        .not('tenant_id', 'is', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('getAccessCountByTenant API Error:', error);
        break;
      }

      if (data && data.length > 0) {
        data.forEach(log => {
          const tid = log.tenant_id as string;
          countMap.set(tid, (countMap.get(tid) || 0) + 1);
        });
        
        offset += PAGE_SIZE;
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      
      // 安全のため10ページ（最大1万件）で制限
      if (offset >= 10000) {
        hasMore = false;
      }
    }
    
    return countMap;
  } catch (error) {
    console.error('getAccessCountByTenant Error:', error);
    return new Map();
  }
}
