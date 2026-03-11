'use client';

import { useTransition, useState } from 'react';
import { sendManualAlert } from '@/features/myou/actions';
import { Bell, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ExpiringProduct {
  serial_number: string;
  expiration_date: string;
  status: string;
  myou_companies: {
    company_id: string;
    company_name: string;
    email_address: string;
  };
}

interface Props {
  products: ExpiringProduct[];
}

export default function ExpiringProductsTable({ products }: Props) {
  const [isPending, startTransition] = useTransition();
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 会社ごとに製品をグループ化
  const groupedByCompany = products.reduce((acc, product) => {
    const companyId = product.myou_companies.company_id;
    if (!acc[companyId]) {
      acc[companyId] = {
        name: product.myou_companies.company_name,
        email: product.myou_companies.email_address,
        products: []
      };
    }
    acc[companyId].products.push(product);
    return acc;
  }, {} as Record<string, { name: string; email: string; products: ExpiringProduct[] }>);

  const handleSendAlert = (companyId: string) => {
    setActiveCompanyId(companyId);
    setResult(null);
    
    startTransition(async () => {
      const response = await sendManualAlert(companyId);
      if (response.success) {
        setResult({ type: 'success', message: 'アラートメールを送信しました。' });
      } else {
        setResult({ type: 'error', message: response.error || '送信に失敗しました。' });
      }
      setActiveCompanyId(null);
    });
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium">現在、期限間近の製品はありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          result.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {result.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{result.message}</span>
          <button onClick={() => setResult(null)} className="ml-auto text-xs underline">閉じる</button>
        </div>
      )}

      {Object.entries(groupedByCompany).map(([companyId, company]) => (
        <div key={companyId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                <Mail className="h-3 w-3 mr-1" /> {company.email || 'メールアドレス未設定'}
              </p>
            </div>
            <button
              onClick={() => handleSendAlert(companyId)}
              disabled={isPending || !company.email}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isPending && activeCompanyId === companyId
                  ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:transform active:scale-95 disabled:opacity-50 disabled:bg-gray-400'
              }`}
            >
              {isPending && activeCompanyId === companyId ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>送信中...</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span>アラート送信</span>
                </>
              )}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">シリアル番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">有効期限</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">残り日数</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {company.products.map((p) => {
                  const daysLeft = Math.ceil((new Date(p.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={p.serial_number} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{p.serial_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.expiration_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          daysLeft <= 7 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {daysLeft <= 0 ? '期限切れ' : '期限間近'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {daysLeft > 0 ? `${daysLeft}日` : '0日'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
