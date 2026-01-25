import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Layers } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function SettingsPage() {
    const supabase = await createClient();
    
    // ユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser();
    
    // データ取得用の初期値
    let employeeCount = 0;
    let divisionCount = 0;
    let tenantName = "未設定";

    if (user) {
        // 所属テナントを取得するための従業員データ取得
        const { data: employee } = await supabase
            .from("employees")
            .select("tenant_id")
            .eq("id", user.id)
            .single();

        if (employee?.tenant_id) {
            // テナント名取得
            const { data: tenant } = await supabase
                .from("tenants")
                .select("name")
                .eq("id", employee.tenant_id)
                .single();
            if (tenant) tenantName = tenant.name;

            // 従業員数取得
            const { count: eCount } = await supabase
                .from("employees")
                .select("*", { count: 'exact', head: true })
                .eq("tenant_id", employee.tenant_id);
            if (eCount !== null) employeeCount = eCount;

            // 部署数取得
            const { count: dCount } = await supabase
                .from("divisions")
                .select("*", { count: 'exact', head: true })
                .eq("tenant_id", employee.tenant_id);
            if (dCount !== null) divisionCount = dCount;
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">基本設定</h3>
                <p className="text-sm text-muted-foreground">
                    組織全体のステータスと構成を確認できます。
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* 組織名カード */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">組織名</CardTitle>
                        <Building2 className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenantName}</div>
                        <p className="text-xs text-muted-foreground">
                            現在のログイン組織
                        </p>
                    </CardContent>
                </Card>

                {/* 従業員数カード */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">総従業員数</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{employeeCount}名</div>
                        <p className="text-xs text-muted-foreground">
                            登録済みアカウント数
                        </p>
                    </CardContent>
                </Card>

                {/* 部署数カード */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">部署・部門数</CardTitle>
                        <Layers className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{divisionCount}</div>
                        <p className="text-xs text-muted-foreground">
                            組織図上の部門総数
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-6 border-dashed bg-gray-50/50">
                 <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <p className="text-sm">その他の組織設定や詳細分析は、各メニューからご利用いただけます。</p>
                </CardContent>
            </Card>
        </div>
    );
}
