import React from 'react';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function SubMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const categoryId = resolvedSearchParams.service_category_id as string;

  if (!categoryId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <p>カテゴリーが選択されていません。</p>
        <p className="text-sm mt-2">サイドメニューから項目を選択してください。</p>
      </div>
    );
  }

  const supabase = await createClient();

  // 1. カテゴリ情報の取得
  const { data: category } = await supabase
    .from('service_category')
    .select('name')
    .eq('id', categoryId)
    .single();

  // 2. サービス一覧の取得
  const { data: services } = await supabase
    .from('service')
    .select('*')
    .eq('service_category_id', categoryId)
    .order('sort_order', { ascending: true });

  const CARD_VARIANTS = [
    { bar: 'bg-blue-500', text: 'text-blue-600', hover: 'group-hover:text-blue-700' },
    { bar: 'bg-teal-400', text: 'text-teal-600', hover: 'group-hover:text-teal-700' },
    { bar: 'bg-orange-500', text: 'text-orange-600', hover: 'group-hover:text-orange-700' },
    { bar: 'bg-indigo-500', text: 'text-indigo-600', hover: 'group-hover:text-indigo-700' },
    { bar: 'bg-pink-500', text: 'text-pink-600', hover: 'group-hover:text-pink-700' },
    { bar: 'bg-green-500', text: 'text-green-600', hover: 'group-hover:text-green-700' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* 3. タイトルの表示 (モダンなスタイル) */}
      <div className="relative pl-5">
        <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {category?.name || '未設定のカテゴリ'}
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium pl-0.5">
          関連する業務アプリケーション一覧
        </p>
      </div>

      {/* 4. & 5. サービスカード一覧 */}
      {(!services || services.length === 0) ? (
         <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
           <p className="text-slate-500">利用可能なサービスがありません。</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => {
            const variant = CARD_VARIANTS[index % CARD_VARIANTS.length];
            
            return (
              <Link
                key={service.id}
                href={service.route_path || '#'}
                className={`
                  flex flex-col text-left group
                  bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 
                  border border-slate-100 hover:border-slate-200 hover:-translate-y-1
                  overflow-hidden relative h-full
                `}
              >
                {/* 左側の色枠 (Solid Color Bar) */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${variant.bar}`}></div>

                <div className="p-5 pl-7 w-full flex flex-col h-full">
                  
                  {/* 2. サブタイトル (Role: Category/Tag) - 画像の色付き文字に対応 */}
                  {service.title ? (
                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${variant.text}`}>
                      {service.title}
                    </div>
                  ) : (
                    // タイトルがない場合もスペースを確保するか、あるいは名前を強調する装飾を入れる
                    <div className="h-4 mb-2"></div> 
                  )}

                  {/* 1. サービス名 (Role: Main Title) - 最も強調 */}
                  <h3 className={`text-lg font-bold text-slate-900 mb-2 transition-colors ${variant.hover}`}>
                    {service.name}
                  </h3>

                  {/* 3. 説明 (Role: Description) - 控えめ */}
                  {service.description && (
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mt-1">
                      {service.description}
                    </p>
                  )}
                  
                  {/* Hover Arrow */}
                  <div className="mt-auto pt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                      <span className={`${variant.text}`}>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}