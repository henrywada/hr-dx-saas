import React from 'react';

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { tenantId } = await params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">テナント詳細: {tenantId}</h1>
      <p className="text-gray-600">このページは現在開発中です。</p>
    </div>
  );
}
