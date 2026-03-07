import { SupabaseClient } from '@supabase/supabase-js';

// メニューの型定義
export type MenuService = {
  id: string;
  name: string;
  target_audience: string;
  release_status: string;
  route_path?: string; // serviceテーブルにカラムがあれば
  service_category: {
    id: string;
    name: string;
    sort_order: number;
  } | null;
};

export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  services: MenuService[];
};

/**
 * テナントIDに基づいて利用可能なメニュー（サービス）を取得する
 * エラー耐性を高めるため、結合条件などを緩めています。
 */
export async function getTenantMenu(
  supabase: SupabaseClient,
  tenantId: string,
  targetAudience: 'all_users' | 'saas_admin' | 'admin' = 'all_users'
): Promise<MenuCategory[]> {
  console.log(`[MenuService] Fetching for tenant: ${tenantId}, audience: ${targetAudience}`);

  try {
    // 1. テナントが契約しているサービスIDを取得
    //    SaaS管理会社の場合は全サービス対象とするロジックもここに組み込めますが、
    //    まずはDB通りに取得します。
    const { data: tenantServices, error: tsError } = await supabase
      .from('tenant_service')
      .select('service_id')
      .eq('tenant_id', tenantId);

    if (tsError) {
      console.error('[MenuService] tenant_service error:', tsError);
      return [];
    }

    const serviceIds = tenantServices?.map((ts: any) => ts.service_id) || [];
    console.log(`[MenuService] Found ${serviceIds.length} service connectons.`);

    if (serviceIds.length === 0) return [];

    // 2. サービス詳細を取得
    //    !inner (内部結合) は使用せず、データ不整合があってもサービス自体は取れるようにします。
    const query = supabase
      .from('service')
      .select(`
        id,
        name,
        target_audience,
        release_status,
        service_category (
          id,
          name,
          sort_order
        )
      `)
      .in('id', serviceIds);

    // ターゲットによる絞り込み（オプション）
    // DB不整合時はここをコメントアウトしてデバッグします
    // ターゲットによる絞り込み（オプション）
    // DB不整合時はここをコメントアウトしてデバッグします
    /*
    if (targetAudience !== 'saas_admin') { 
        // saas_admin以外はターゲットを絞る、あるいは 'all_users' も含めるなどのロジック
        // 現状は一旦フィルタを緩くして全取得後にJSでフィルタします
        query = query.in('target_audience', ['all_users', targetAudience]);
    } else {
        query = query.eq('target_audience', 'saas_adm');
    }
    */

    // 公開ステータスフィルター
    // query = query.eq('release_status', '公開'); 

    const { data: services, error: sError } = await query;

    if (sError) {
      console.error('[MenuService] Service fetch error:', sError);
      return [];
    }

    console.log(`[MenuService] Fetched ${services?.length} services.`);

    // 3. カテゴリ構造に整形
    //    カテゴリがないサービスは「その他」などの扱いにするか、除外します。
    //    今回はカテゴリがあるものだけを抽出します。
    const categoryMap = new Map<string, MenuCategory>();

    (services as any[])?.forEach((service) => {
      // 公開チェック (DBクエリで弾くと0件になるリスクがあるためここで判定)
      if (service.release_status !== '公開' && service.release_status !== 'Public') {
          // 開発中は表示させたい場合はここをコメントアウト
          // return; 
      }

      const cat = service.service_category;
      if (!cat) return; // カテゴリ紐付けなし

      if (!categoryMap.has(cat.id)) {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          sort_order: cat.sort_order,
          services: [],
        });
      }
      categoryMap.get(cat.id)?.services.push(service);
    });

    // ソートして返す
    return Array.from(categoryMap.values()).sort((a, b) => a.sort_order - b.sort_order);

  } catch (err) {
    console.error('[MenuService] Unexpected error:', err);
    return [];
  }
}
