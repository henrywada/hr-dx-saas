import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  // サービス一覧と、プルダウン用のカテゴリ一覧を同時に取得
  const [servicesRes, categoriesRes] = await Promise.all([
    supabase.from('service').select('*').order('sort_order', { ascending: true }),
    supabase.from('service_category').select('*').order('sort_order', { ascending: true })
  ]);

  if (servicesRes.error) return NextResponse.json({ error: servicesRes.error.message }, { status: 500 });

  return NextResponse.json({
    services: servicesRes.data,
    categories: categoriesRes.data || []
  });
}