import { createClient } from "@/utils/supabase/server";
import {
  FileText,
  Activity,
  Users,
  Building2,
  User,
  ShieldCheck, // Icon for Role
  Database,   // Icon for SaaS stats
  Layers,     // For Divisions
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cookies } from "next/headers";
import { 
  getDashboardHeaderData, 
  getCompanyDashboardStats, 
  getSaaSDashboardStats,
  getSaaSTenantList,
  getManagerDashboardAnalytics,
} from "@/utils/dashboard-actions";
import { ManagerAlertBanner } from "@/components/dashboard/ManagerAlertBanner"; 
import { ManagerDashboardAnalytics } from "@/components/dashboard/ManagerDashboardAnalytics";

export default async function DashboardPage() {
  // Fetch Mode to decide what to show
  const cookieStore = await cookies();
  const dashboardMode = cookieStore.get("dashboard_mode")?.value || "company";
  
  // Header Data
  const headerData = await getDashboardHeaderData();

  // Stats Data
  const isSaaSMode = dashboardMode === "saas";
  const companyStats = !isSaaSMode ? await getCompanyDashboardStats() : null;
  const saasStats = isSaaSMode ? await getSaaSDashboardStats() : null;
  const tenantList = isSaaSMode ? await getSaaSTenantList() : [];
  
  // Analytics Data (only for Company Admin)
  const analyticsData = !isSaaSMode ? await getManagerDashboardAnalytics() : null;

  if (!headerData) {
    return <div className="p-8">Loading or access denied...</div>;
  }

  return (
    <div className="flex-1 space-y-8">
      {/* ▼▼ Header Information Area ▼▼ */}
      <div className="flex items-center text-gray-600 py-2 px-1">
        
          {/* 1. Tenant Name */}
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-bold text-gray-700">{headerData.tenantName}</span>
          </div>

          <span className="mx-4 text-gray-300">|</span>

          {/* 2. User Name */}
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{headerData.userName}</span>
          </div>

          <span className="mx-4 text-gray-300">|</span>

          {/* 3. Role Name */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
              {headerData.roleName}
            </span>
          </div>
      </div>

      {/* ▼▼ Dashboard Content Body ▼▼ */}
      {isSaaSMode ? (
        // === SaaS Admin Content ===
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">SaaS管理ダッシュボード</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-500">登録テナント総数</h3>
                  <Building2 className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-gray-900">{saasStats?.tenantCount}</div>
                <p className="text-xs text-gray-500 mt-1">Acitve Tenants</p>
             </div>
             
             <div className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-sm font-medium text-gray-500">システムステータス</h3>
                  <Activity className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-xl font-bold text-green-600">{saasStats?.systemHealth}</div>
                <p className="text-xs text-gray-500 mt-1">All systems operational</p>
             </div>
          </div>
          
          <div className="mt-8">
             {/* Yellow Info Box (kept as requested "below this") */}
             <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-8">
               <p className="text-sm text-yellow-800">
                 ※ ここにはSaaS管理者向けの重要な指標（全テナントの利用状況、エラーログ、契約更新アラートなど）が表示されます。
               </p>
             </div>

             {/* Tenant List Table matching the uploaded image */}
             <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 text-gray-700 font-medium border-b">
                      <tr>
                        <th className="px-6 py-4 whitespace-nowrap">会社ID (UUID)</th>
                        <th className="px-6 py-4 whitespace-nowrap">会社名</th>
                        <th className="px-6 py-4 whitespace-nowrap">登録日</th>
                        <th className="px-6 py-4 whitespace-nowrap text-right">ステータス</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tenantList.map((tenant: any) => (
                        <tr key={tenant.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">{tenant.id}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">{tenant.name}</td>
                          <td className="px-6 py-4 text-gray-500">
                             {new Date(tenant.created_at).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                      {tenantList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            登録されたテナントはありません。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
        </div>
      ) : (
        // === Company Admin Content ===
        <div>
           {/* マネージャーアラートバナー */}
           <ManagerAlertBanner />
           
           {/* アナリティクス & トレンド (New Section) */}
           <div className="mb-8">
             <ManagerDashboardAnalytics analytics={analyticsData} />
           </div>

           {/* Top Stats Cards */}
           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
             {/* 1. Organization Name */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">組織名</CardTitle>
                    <Building2 className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold truncate" title={companyStats?.tenantName}>
                        {companyStats?.tenantName}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        現在のログイン組織
                    </p>
                </CardContent>
            </Card>

            {/* 2. Employee Count */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">総従業員数</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{companyStats?.employeeCount}名</div>
                    <p className="text-xs text-muted-foreground">
                        登録済みアカウント数
                    </p>
                </CardContent>
            </Card>

            {/* 3. Division Count */}
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">部署・部門数</CardTitle>
                    <Layers className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{companyStats?.divisionCount}</div>
                    <p className="text-xs text-muted-foreground">
                        組織図上の部門総数
                    </p>
                </CardContent>
            </Card>

            {/* 4. Active Services */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">利用中のサービス</CardTitle>
                <Activity className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{companyStats?.activeServices}</div>
                <p className="text-xs text-muted-foreground">
                    Active Services
                </p>
              </CardContent>
            </Card>
           </div>
        </div>
      )}
    </div>
  );
}
