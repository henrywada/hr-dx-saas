import React from 'react';
import { Metadata } from 'next';
import MarketAnalysisDashboard from '@/features/market-analysis/components/MarketAnalysisDashboard';
import { getServerUser } from '@/lib/auth/server-user';
import { PaywallOverlay } from '@/features/recruitment-ai/components/PaywallOverlay';

export const metadata: Metadata = {
  title: '採用市場・競合分析 | SaaS App',
  description: '採用市場や競合他社の求人動向を分析するダッシュボードです。',
};

export default async function MarketAnalysisPage() {
  const user = await getServerUser();
  const planType = user?.planType || 'free';
  const isLocked = planType !== 'pro';

  return (
    <div className="p-6">
      <PaywallOverlay 
        isLocked={isLocked}
        message="採用市場・競合分析機能はProプラン限定です"
      >
        <MarketAnalysisDashboard />
      </PaywallOverlay>
    </div>
  );
}
