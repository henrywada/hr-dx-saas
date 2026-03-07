import React from 'react';
import { DASHBOARD_CARDS } from '@/config/dashboard-config';
import { logActivity } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // ログ記録：ポータルアクセス
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    let tenantId = user.user_metadata?.tenant_id;
    let employeeId = null;

    // 従業員情報を取得し、そこからtenant_idとemployee_idを決定する
    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();
      
      if (employee) {
        employeeId = employee.id;
        // employeesテーブルのtenant_idを優先使用（Authメタデータ不整合対策）
        if (employee.tenant_id) {
          tenantId = employee.tenant_id;
        }
      }
    } catch {
      // ignore
    }

    // tenantIdが特定できた場合のみログ記録
    if (tenantId) {
      await logActivity({
        tenantId: tenantId,
        employeeId: employeeId,
        action: 'VIEW',
        entityType: 'SYSTEM',
        description: 'Accessed Portal Dashboard',
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ポータル</h1>
        <p className="text-sm text-slate-500 mt-1">
          本日の業務状況と主要な指標を確認できます。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {DASHBOARD_CARDS.map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={index}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color} bg-opacity-10 text-opacity-100`}>
                   <div className={`${card.color.replace('bg-', 'text-')} bg-opacity-0`}>
                     <Icon className="w-6 h-6" />
                   </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {card.trend}
                </span>
              </div>
              
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
                <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm min-h-[300px]">
          <h3 className="font-bold text-lg mb-4 text-slate-800">月次アクティビティ</h3>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-400">
            チャートが表示されます
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-4 text-slate-800">最近の通知</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-accent-orange mt-2 shrink-0"></div>
                <div>
                  <p className="text-sm text-slate-800 font-medium">システムメンテナンスのお知らせ</p>
                  <p className="text-xs text-slate-500 mt-1">2026-02-15 10:00</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}