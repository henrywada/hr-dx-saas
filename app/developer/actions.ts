"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { createEmployeeUser } from "@/utils/employee";

export type State = {
    error?: string;
    success?: boolean;
    message?: string;
};

// 会社（テナント）と管理者（契約者）を一括登録する
export async function registerCompany(
    prevState: State,
    formData: FormData,
): Promise<State> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. 実行者の権限チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "ログインしてください。" };

    // 簡易チェック: 本来はapp_Role='developer'をチェックすべきですが、
    // まずは誰でも登録できるようにして、後で制限をかけます。
    // const { data: actor } = await supabase.from('employees').select('app_role').eq('id', user.id).single();
    // if (actor?.app_role !== 'developer') return { error: "権限がありません。" };

    const companyName = formData.get("companyName") as string;
    const adminEmail = formData.get("adminEmail") as string;
    const adminName = formData.get("adminName") as string;

    if (!companyName || !adminEmail || !adminName) {
        return { error: "すべての項目を入力してください。" };
    }

    try {
        // 2. テナントの作成
        const { data: tenant, error: tenantError } = await adminSupabase
            .from("tenants")
            .insert({
                name: companyName,
                contact_date: new Date().toISOString().split("T")[0],
                employee_count: 1,
            })
            .select()
            .single();

        if (tenantError) {
            throw new Error("会社の作成に失敗: " + tenantError.message);
        }

        // 3. デフォルトサービスの紐付け（サービスがあれば）
        const { data: services } = await adminSupabase.from("service").select(
            "id",
        )
            .limit(1);
        if (services && services.length > 0) {
            await adminSupabase.from("tenant_service").insert({
                tenant_id: tenant.id,
                service_id: services[0].id,
                start_date: new Date().toISOString().split("T")[0],
                status: "active",
            });
        }

        // 4. 契約者（管理者）の作成
        await createEmployeeUser(
            adminSupabase,
            adminEmail,
            adminName,
            tenant.id,
            "hr_manager", // 契約者は人事マネージャー権限
            null, // 所属部署なし
        );

        return {
            success: true,
            message:
                `「${companyName}」と管理者を登録しました。メール内のコードを「新規登録」画面で入力してください。`,
        };
    } catch (e: any) {
        console.error(e);
        return { error: e.message };
    }
}
