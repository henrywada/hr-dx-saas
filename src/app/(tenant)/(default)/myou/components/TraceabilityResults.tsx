'use client';

import { Package, Truck, Calendar, MapPin, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDateTimeInJST } from '@/lib/datetime';

interface Log {
  id: string;
  serial_number: string;
  company_id: string;
  delivery_date: string;
  delivered_by?: string;
  myou_companies?: {
    company_name: string;
  };
}

interface Product {
  serial_number: string;
  expiration_date: string;
  status: string;
}

interface TraceabilityResultsProps {
  data: {
    product: Product;
    history: Log[];
  } | null;
  searched: boolean;
}

export default function TraceabilityResults({ data, searched }: TraceabilityResultsProps) {
  if (!searched) return null;

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800 mb-2">製品が見つかりません</h3>
        <p className="text-sm text-red-600">
          入力されたシリアル番号はデータベースに登録されていないか、正しくありません。
          番号を再度お確かめください。
        </p>
      </div>
    );
  }

  const { product, history } = data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 製品基本情報カード */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
          <h3 className="text-white font-bold flex items-center">
            <Package className="h-5 w-5 mr-2" />
            製品ステータス
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">シリアル番号</p>
            <p className="text-xl font-mono font-black text-gray-900">{product.serial_number}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">有効期限</p>
            <p className={`text-lg font-bold flex items-center ${
              new Date(product.expiration_date) < new Date() ? 'text-red-600' : 'text-gray-900'
            }`}>
              <Calendar className="h-4 w-4 mr-2" />
              {product.expiration_date}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">現在の状態</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold shadow-sm ${
              product.status === 'delivered' ? 'bg-green-100 text-green-700' : 
              product.status === 'produced' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {product.status === 'delivered' ? '施工会社納入済' : 
               product.status === 'produced' ? '製造完了・在庫中' : product.status}
            </span>
          </div>
        </div>
      </div>

      {/* 流通履歴タイムライン */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center pl-1">
          <Truck className="h-5 w-5 mr-2 text-blue-600" />
          流通履歴タイムライン
        </h3>

        <div className="relative">
          {/* 垂直ライン */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          <div className="space-y-8 relative">
            {history.length > 0 ? (
              history.map((log, index) => (
                <div key={log.id} className="flex group">
                  {/* アイコン */}
                  <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white shadow-md transition-transform group-hover:scale-110 ${
                    index === 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <MapPin className="h-6 w-6" />
                  </div>

                  {/* コンテンツ */}
                  <div className="flex-grow ml-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all group-hover:shadow-md group-hover:border-blue-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                      <h4 className="text-lg font-black text-gray-900 flex items-center">
                        {log.myou_companies?.company_name}
                        {index === 0 && (
                          <span className="ml-3 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">最終納入地</span>
                        )}
                      </h4>
                      <div className="text-sm font-medium text-blue-600 flex items-center mt-1 md:mt-0">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        {formatDateTimeInJST(log.delivery_date)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4 border-t border-gray-50 pt-4">
                      <div className="flex items-center text-gray-600">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        納入担当者: <span className="font-semibold text-gray-900 ml-1">{log.delivered_by || 'システム登録'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Truck className="h-4 w-4 mr-2 text-gray-400" />
                        納入方式: <span className="font-semibold text-gray-900 ml-1">直接納入</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center space-x-6">
                <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-gray-100 text-gray-400 shadow-sm">
                  <Package className="h-6 w-6" />
                </div>
                <div className="bg-gray-50 p-5 rounded-2xl border border-dashed border-gray-300 flex-grow italic text-gray-500">
                  納入履歴がまだありません。製造完了後、在庫状態です。
                </div>
              </div>
            )}

            {/* 起点（製造完了など） */}
            <div className="flex">
              <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 border-white bg-green-500 text-white shadow-md">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-grow ml-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm self-center">
                <p className="font-black text-gray-900">製造・検品完了</p>
                <p className="text-xs text-gray-500 mt-1">製品が正規ルートで製造されたことを確認しました。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 認証済み証跡 */}
      <div className="bg-green-50 rounded-2xl p-6 border border-green-100 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-green-500 p-2 rounded-full mr-4">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h4 className="text-green-900 font-black">トレーサビリティ認証済み</h4>
            <p className="text-green-700 text-xs mt-0.5">この製品は製造から納入まで全ての経路が記録されています。</p>
          </div>
        </div>
        <div className="hidden sm:block">
           <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-200/50 px-3 py-1 rounded-full">Secure Trace</div>
        </div>
      </div>
    </div>
  );
}
