import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = createAdminClient();

  // 過去7日間の日付を取得（UTC基準）
  const dates = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }).reverse();

  // system_logs から action='VIEW' の日次件数を取得
  // Supabaseはgroup byが使えるのでまとめて取得する方法もありますが、
  // ここではシンプルに日付ごとにクエリを投げる形にしています。

  const data = await Promise.all(dates.map(async (date) => {
    const { count, error } = await supabase
      .from('system_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'VIEW')
      .gte('created_at', `${date}T00:00:00Z`)
      .lte('created_at', `${date}T23:59:59Z`);

    if (error) {
      console.error('Error fetching system_logs for date', date, error);
      return { date: date.slice(5).replace('-', '/'), value: 0 };
    }

    return {
      date: date.slice(5).replace('-', '/'), // MM/DD形式に変換
      value: count ?? 0,
    };
  }));

  return NextResponse.json(data);
}