import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { BasicSettingsForm } from "./_components/basic-settings-form";

// キャッシュを無効化し、常に最新データを取得
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BasicSettingsPage() {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div className="p-4">認証エラー。ログインしてください。</div>;
    }

    // ユーザーの所属テナントIDを取得
    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee?.tenant_id) {
        return <div className="p-4">所属テナントが見つかりません。管理者にお問い合わせください。</div>;
    }

    // adminクライアントでRLSをバイパスして設定取得
    const { data: config, error } = await adminSupabase
        .from("pulse_configs")
        .select("survey_frequency")
        .eq("tenant_id", employee.tenant_id)
        .maybeSingle();

    // デバッグ用ログ
    console.log("[BasicSettings] Fetched config:", config);
    console.log("[BasicSettings] Error:", error);

    // データがない場合はデフォルト値「weekly」を使用
    const displayFrequency = config?.survey_frequency ?? "weekly";
    
    console.log("[BasicSettings] Display frequency:", displayFrequency);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
            <BasicSettingsForm 
                key={`${employee.tenant_id}-${displayFrequency}`}
                initialFrequency={displayFrequency}
                tenantId={employee.tenant_id}
            />
        </div>
    );
}
