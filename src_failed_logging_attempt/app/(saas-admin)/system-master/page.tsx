import SystemMasterTabs from '@/features/system-master/components/SystemMasterTabs';

export default function SystemMasterPage() {
  return (
    // flex-1 w-full を指定し、親のコンテナいっぱいに広がるようにします
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">システムマスタ管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            サービスのカテゴリ、各サービスの詳細、および権限ロールの基本設定を管理します。
          </p>
        </div>
        
        <div className="w-full bg-white">
          <SystemMasterTabs />
        </div>
      </div>
    </main>
  );
}