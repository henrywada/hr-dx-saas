import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // tenantsテーブルを取得し、関連するemployeesの数をカウントする
    // Supabaseのcount機能を利用して、各テナントに紐づく従業員数を取得します
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        employee_count,
        employees:employees(count)
      `);

    if (error) throw error;

    // データの整形
    const formattedData = data.map((t: any) => ({
      id: t.id,
      name: t.name,
      contract_limit: t.employee_count ?? 0, // 契約上限
      actual_count: t.employees?.[0]?.count ?? 0 // 実際の登録数
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Tenants API Error:', error);
    return NextResponse.json([], { status: 500 });
  }
}