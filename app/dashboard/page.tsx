import { createClient } from "@/utils/supabase/server";
import {
  FileText,
  Activity,
  Users,
  MoreHorizontal,
  Building2, // 会社アイコン
  User       // ユーザーアイコン
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName = "ゲスト";
  let tenantName = "未所属";

  if (user) {
    userName = user.email || "ゲスト";
    try {
      const { data: employee } = await supabase
        .from("employees")
        .select("name, tenant_id")
        .eq("id", user.id)
        .single();

      if (employee) {
        if (employee.name) userName = employee.name;
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

      {/* ▼▼ 修正エリア：会社名・ユーザー名表示 ▼▼ */}
      {/* 横並び(flex)、アイコン付き、通常フォント、下線削除 */}
      <div className="flex items-center gap-4 text-gray-600">

        {/* 会社名 */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">{tenantName}</span>
        </div>

        {/* 区切り（パイプ） */}
        <span className="text-gray-300">|</span>

        {/* ユーザー名 */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">{userName}</span>
        </div>

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