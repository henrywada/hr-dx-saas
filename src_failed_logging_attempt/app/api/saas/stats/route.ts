import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin'; // 名前を合わせる

export async function GET() {
  try {
    // 関数を実行して管理者用クライアントを生成
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

    return NextResponse.json({
      tenantCount: tenantCount ?? 0,
      userCount: userCount ?? 0,
      publishedServiceCount: publishedServiceCount ?? 0,
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}