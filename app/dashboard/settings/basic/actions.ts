"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

export type State = {
    error?: string;
    success?: boolean;
    message?: string;
};

export async function updatePulseConfig(
    prevState: State,
    formData: FormData,
): Promise<State> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "認証されていません。" };
    }

    // ユーザーのテナントIDを取得
    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee?.tenant_id) {
        return { error: "所属テナントが見つかりません。" };
    }

    const frequency = formData.get("frequency") as string;

    if (!frequency) {
        return { error: "頻度が選択されていません。" };
    }

    // tenant_idで既存データを確認
    const { data: existing } = await adminSupabase
        .from("pulse_configs")
        .select("id")
        .eq("tenant_id", employee.tenant_id)
        .maybeSingle();

    let error = null;

    if (existing) {
        // データが存在する場合は更新
        const result = await adminSupabase
            .from("pulse_configs")
            .update({ survey_frequency: frequency })
            .eq("tenant_id", employee.tenant_id);
        error = result.error;
    } else {
        // データが存在しない場合は新規作成
        const result = await adminSupabase
            .from("pulse_configs")
            .insert({
                tenant_id: employee.tenant_id,
                survey_frequency: frequency,
                delivery_day: 5,
                delivery_time: "16:00:00",
                is_active: true,
            });
        error = result.error;
    }

    if (error) {
        console.error("Pulse Config Error:", error);
        return { error: `設定の更新に失敗しました: ${error.message}` };
    }

    revalidatePath("/dashboard/settings/basic");
    return { success: true, message: "設定を更新しました。" };
}
