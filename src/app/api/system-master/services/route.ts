import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  // サービス一覧と、プルダウン用のカテゴリ一覧を同時に取得
  const [servicesRes, categoriesRes] = await Promise.all([
    supabase.from('service').select(`
        *,
        service_category (
          sort_order
        )
      `),
    supabase.from('service_category').select('*').order('sort_order', { ascending: true })
  ]);

  if (servicesRes.error) return NextResponse.json({ error: servicesRes.error.message }, { status: 500 });

  const raw = servicesRes.data || [];
  raw.sort((a, b) => {
    const ca = a.service_category?.sort_order ?? Number.MAX_SAFE_INTEGER;
    const cb = b.service_category?.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (ca !== cb) return ca - cb;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
  const services = raw.map(({ service_category: _c, ...rest }) => rest);

  return NextResponse.json({
    services,
    categories: categoriesRes.data || []
  });
}