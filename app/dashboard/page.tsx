import { createClient } from "@/utils/supabase/server";
import {
  FileText,
  Activity,
  Users,
  MoreHorizontal,
  Building2,
  User,
  Settings
} from "lucide-react";
import Link from "next/link";

const ROLE_MAP: Record<string, string> = {
  employee: "従業員",
  hr_manager: "人事マネージャー",
  hr: "人事",
  boss: "上司",
  company_doctor: "産業医",
  company_nurse: "保健師",
  hsc: "安全衛生委員",
  developer: "開発者",
  test: "system tester",
};

const SETTINGS_ALLOWED_ROLES = ["hr_manager", "hr", "developer", "test"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName = "ゲスト";
  let tenantName = "未所属";
  let userRole = "";

  if (user) {
    userName = user.email || "ゲスト";
    try {
      const { data: employee } = await supabase
        .from("employees")
        .select("name, tenant_id, app_role")
        .eq("id", user.id)
        .single();

      if (employee) {
        if (employee.name) userName = employee.name;
        if (employee.app_role) userRole = employee.app_role;
        if (employee.tenant_id) {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", employee.tenant_id)
            .single();
          if (tenant?.name) tenantName = tenant.name;
        }
      }
    } catch (error) {
      // エラー時は無視
    }
  }

  return (
    <div className="flex-1 space-y-8">

      {/* ▼▼ 修正エリア：会社名・ユーザー名表示・設定ボタン ▼▼ */}
      <div className="flex items-center justify-between text-gray-600">
        <div className="flex items-center gap-4">
          
          {/* 会社名 */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{tenantName}</span>
          </div>

          {/* 区切り */}
          <span className="text-gray-300">|</span>

          {/* ユーザー名 + ロール */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{userName}</span>
              {userRole && (
                <span className="text-xs text-gray-500">
                  【 {ROLE_MAP[userRole] || userRole} 】
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 設定ボタン (権限がある場合のみ) */}
        {SETTINGS_ALLOWED_ROLES.includes(userRole) && (
          <Link 
            href="/dashboard/settings" 
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
          >
            <Settings className="h-4 w-4" />
            <span>設定 (Settings)</span>
          </Link>
        )}
      </div>
      {/* ▲▲ 修正エリア終了 ▲▲ */}


      {/* カードエリア */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-gray-500">Created Workflows</h3>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <div className="p-6 pt-0"><div className="text-2xl font-bold">12</div></div>
        </div>

        <div className="rounded-xl border bg-white text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-gray-500">Monthly Executions</h3>
            <Activity className="h-4 w-4 text-green-500" />
          </div>
          <div className="p-6 pt-0"><div className="text-2xl font-bold">145</div></div>
        </div>

        <div className="rounded-xl border bg-white text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-gray-500">Team Members</h3>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <div className="p-6 pt-0"><div className="text-2xl font-bold">3</div></div>
        </div>
      </div>

      {/* テーブルエリア */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Recent Workflows</h2>
          <button className="text-sm text-gray-500 hover:text-gray-900 border px-3 py-1 rounded bg-white">
            View All
          </button>
        </div>

        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-4 py-3">Project Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">Onboarding Automation</td>
                <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span></td>
                <td className="px-4 py-3 text-gray-500">2024-04-01</td>
                <td className="px-4 py-3 text-right"><button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-4 w-4" /></button></td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">Email Campaign Sequence</td>
                <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">Draft</span></td>
                <td className="px-4 py-3 text-gray-500">2024-03-28</td>
                <td className="px-4 py-3 text-right"><button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-4 w-4" /></button></td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium">Data Sync: CRM to sheet</td>
                <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span></td>
                <td className="px-4 py-3 text-gray-500">2024-03-25</td>
                <td className="px-4 py-3 text-right"><button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-4 w-4" /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}