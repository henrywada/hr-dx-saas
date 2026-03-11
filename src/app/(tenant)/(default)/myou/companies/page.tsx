import { Suspense } from 'react';
import { getCompanies } from '@/features/myou/actions';
import CompanyMaintenance from '../components/CompanyMaintenance';
import TestQrModal from '../components/TestQrModal';
import { Metadata } from 'next';
import { Building2, Info } from 'lucide-react';

export const metadata: Metadata = {
  title: '施工会社管理（マスタ保守）',
  description: 'システムに登録されている施工会社（納入先）の情報を管理します。'
};

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <div className="flex items-center space-x-2 text-blue-600 text-xs font-black uppercase tracking-widest mb-2">
                 <span>マスタ保守</span>
                 <span className="text-gray-300">/</span>
                 <span className="text-gray-900">施工会社管理</span>
              </div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
                <Building2 className="h-8 w-8 mr-3 text-blue-600" />
                施工会社（納入先）管理
              </h1>
              <p className="mt-2 text-gray-500 max-w-2xl text-sm font-medium leading-relaxed">
                納入登録や有効期限アラートで使用する施工会社の情報を管理します。
                正しいメールアドレスを登録することで、アラート機能が正常に動作します。
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* メインの保守UI */}
          <div className="lg:col-span-3">
            <Suspense fallback={
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
                <p className="text-gray-400 font-bold italic">マスタ情報を読み込んでいます...</p>
              </div>
            }>
              <CompanyMaintenance initialCompanies={companies as any} />
              <TestQrModal />
            </Suspense>
          </div>

          {/* 右サイドバー: ヘルプ・補足 */}
          <div className="space-y-6">
            <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <h3 className="text-sm font-black mb-4 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                運用上の注意
              </h3>
              <ul className="text-xs space-y-3 font-bold text-blue-100/90 leading-relaxed">
                <li>・会社名は正式名称で入力してください。</li>
                <li>・メールアドレスは「有効期限アラート」の送信先となります。</li>
                <li>・削除を行う際、その会社に納入実績がある場合はデータ整合性に注意してください。</li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">システム統計</div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600">登録済み会社数</span>
                      <span className="text-sm font-black text-gray-900">{companies.length}</span>
                   </div>
                   <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-2/3"></div>
                   </div>
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
