'use client';

import React, { useEffect, useState } from 'react';
import { DASHBOARD_CARDS, DashboardCard } from '@/config/dashboard-config';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [cards, setCards] = useState<DashboardCard[]>(() =>
    DASHBOARD_CARDS.map((c) => ({ ...c }))
  );

  const [activityData, setActivityData] = useState<Array<{ date: string; value: number }>>([]);

  // テナント明細の型定義を更新
  const [tenants, setTenants] = useState<Array<{ id: string; name: string; actual_count: number; contract_limit: number }>>([]);

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1. 統計値取得
        const statsRes = await fetch('/api/saas/stats');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setCards((prev) =>
            prev.map((card) => {
              if (card.title === 'テナント数') return { ...card, value: `${stats.tenantCount ?? 0}社` };
              if (card.title === '登録ユーザ数') return { ...card, value: `${stats.userCount ?? 0}名` };
              if (card.title === '公開・サービス数') return { ...card, value: `${stats.publishedServiceCount ?? 0}件` };
              if (card.title === '未公開・サービス数') return { ...card, value: `0件` }; // 0件固定
              return card;
            })
          );
        }

        // 2. テナント明細取得
        const tenantsRes = await fetch('/api/saas/tenants');
        if (tenantsRes.ok) {
          const tenantsJson = await tenantsRes.json();
          setTenants(tenantsJson);
        }

        // 3. アクティビティ取得
        const activityRes = await fetch('/api/saas/activity');
        if (activityRes.ok) {
          const activityJson = await activityRes.json();
          setActivityData(activityJson);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SaaS管理</h1>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon as any;
          return (
            <div key={index} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color} bg-opacity-10`}>
                  <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
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
        {/* チャート */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm min-h-[300px]">
          <h3 className="font-bold text-lg mb-4 text-slate-800">日次アクティビティ</h3>
          <div className="h-64 bg-slate-50 rounded-lg border border-dashed border-slate-300 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* テナント明細テーブル */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-4 text-slate-800">テナント明細</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="text-left py-2 font-medium">テナント名</th>
                  <th className="text-center py-2 font-medium">登録数</th>
                  <th className="text-right py-2 font-medium">上限</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-700">{t.name}</td>
                    <td className="py-3 text-center text-blue-600 font-bold">{t.actual_count}名</td>
                    <td className="py-3 text-right text-slate-500">{t.contract_limit}名</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}