import os

# Absolute paths in WSL
p1 = "/home/hr-dx/ai-projects/hr-dx-saas/src/app/(tenant)/layout.tsx"
p2 = "/home/hr-dx/ai-projects/hr-dx-saas/src/app/(tenant)/top/page.tsx"

# TenantLayout Content
c1 = """
"use client";

import React from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { CURRENT_USER, CURRENT_USER_ROLE } from "@/lib/auth-mock";

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = CURRENT_USER_ROLE;
  const user = CURRENT_USER;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Header role={role} userName={user.name} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto scroll-smooth">
             <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
                {children}
             </div>
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
"""

# DashboardPage Content
c2 = """import React from 'react';
import { DASHBOARD_CARDS } from '../../../config/dashboard-config';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ダッシュボード</h1>
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
"""

# Write files
with open(p1, "w", encoding="utf-8") as f:
    f.write(c1.strip())
    print(f"Written: {p1}")

with open(p2, "w", encoding="utf-8") as f:
    f.write(c2.strip())
    print(f"Written: {p2}")
