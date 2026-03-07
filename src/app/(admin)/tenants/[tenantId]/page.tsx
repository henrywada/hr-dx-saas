import React from 'react';

export default function TenantDetailPage({ params }: { params: { tenantId: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">テナント詳細: {params.tenantId}</h1>
      <p className="text-gray-600">このページは現在開発中です。</p>
    </div>
  );
}
