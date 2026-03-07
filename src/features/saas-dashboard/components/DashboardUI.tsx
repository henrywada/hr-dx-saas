'use client';

import React from 'react';
import { DASHBOARD_CARDS } from '@/config/dashboard-config';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export interface DashboardUIProps {
  stats: {
    tenantCount: number;
    userCount: number;
    publishedServiceCount: number;
    unpublishedServiceCount: number;
  };
  tenants: Array<{
    id: string;
    name: string;
    accessCount: number;
    actual_count: number;
    contract_limit: number;
  }>;
  activityData: Array<{
    date: string;
    value: number;
  }>;
}

export default function DashboardUI({ stats, tenants, activityData }: DashboardUIProps) {
  // Update the cards based on server-fetched stats
  const cards = DASHBOARD_CARDS.map((card) => {
    if (card.title === 'テナント数') return { ...card, value: `${stats.tenantCount}社` };
    if (card.title === '登録ユーザ数') return { ...card, value: `${stats.userCount}名` };
    if (card.title === '公開・サービス数') return { ...card, value: `${stats.publishedServiceCount}件` };
    if (card.title === '未公開・サービス数') return { ...card, value: `${stats.unpublishedServiceCount}件` };
    return { ...card };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SaaS管理</h1>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon as React.ElementType;
          return (
            <div key={index} className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex items-center justify-between group">
              {/* 左側：タイトルと数値 */}
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">{card.title}</p>
                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{card.value}</h3>
              </div>
              
              {/* 右側：アイコン */}
              <div className={`p-4 rounded-full ${card.color} bg-opacity-10 group-hover:bg-opacity-20 transition-colors duration-300`}>
                <Icon className={`w-8 h-8 ${card.color.replace('bg-', 'text-')}`} />
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
                  <th className="text-center py-2 font-medium">アクセス数</th>
                  <th className="text-center py-2 font-medium">登録数</th>
                  <th className="text-right py-2 font-medium">上限</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-700">{t.name}</td>
                    <td className="py-3 text-center text-emerald-600 font-bold">{t.accessCount.toLocaleString()}</td>
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
