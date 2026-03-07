import React from 'react';

export default function PayrollAppDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">給与明細詳細: {params.id}</h1>
      <p className="text-gray-600">このページは現在開発中です。</p>
    </div>
  );
}
