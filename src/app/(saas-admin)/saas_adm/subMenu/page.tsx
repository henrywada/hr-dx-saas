import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { RouteSegmentLoading } from '@/components/layout/RouteSegmentLoading';
import { SubMenuServiceCard } from '@/components/submenu/SubMenuServiceCard';

export default async function SubMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const categoryId = resolvedSearchParams.service_category_id as string | undefined;

  if (!categoryId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500">
        <p>カテゴリーが選択されていません。</p>
        <p className="text-sm mt-2">サイドメニューから項目を選択してください。</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteSegmentLoading embedded />}>
      <SaasSubMenuCategoryContent categoryId={categoryId} />
    </Suspense>
  );
}

async function SaasSubMenuCategoryContent({ categoryId }: { categoryId: string }) {
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('service_category')
    .select('name')
    .eq('id', categoryId)
    .single();

  const { data: services } = await supabase
    .from('service')
    .select('*')
    .eq('service_category_id', categoryId)
    .eq('release_status', '公開')
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
    <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4 max-w-7xl mx-auto">
      <div className="relative pl-5">
        <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {category?.name || '未設定のカテゴリ'}
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium pl-0.5">関連する業務アプリケーション一覧</p>
      </div>

      {!services || services.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">利用可能なサービスがありません。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => {
            const variant = CARD_VARIANTS[index % CARD_VARIANTS.length];

            return (
              <SubMenuServiceCard
                key={service.id}
                href={service.route_path || '#'}
                variant={variant}
                layout="saas"
                title={service.title}
                name={service.name}
                description={service.description}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
