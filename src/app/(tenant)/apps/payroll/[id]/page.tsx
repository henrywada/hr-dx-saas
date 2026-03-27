import React from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PayrollAppDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">給与明細詳細: {id}</h1>
      <p className="text-gray-600">このページは現在開発中です。</p>
    </div>
  );
}
