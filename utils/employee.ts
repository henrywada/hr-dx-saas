"use server";

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 従業員ユーザーを作成する共通関数
 *
 * @param adminSupabase - Admin権限のSupabaseクライアント
 * @param email - メールアドレス
 * @param name - 氏名
 * @param tenantId - テナントID
 * @param appRole - アプリケーションロール
 * @param divisionId - 所属部署ID（オプション）
 * @returns 作成されたユーザーのID
 */
export async function createEmployeeUser(
    adminSupabase: SupabaseClient,
    email: string,
    name: string,
    tenantId: string,
    appRole: string,
    divisionId?: string | null,
): Promise<string> {
    // 1. OTP招待メール送信（Authユーザー作成）
    const { data: authUser, error: authError } = await adminSupabase.auth.admin
        .inviteUserByEmail(email, {
            data: { tenant_id: tenantId },
            redirectTo: `${
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
            }/signup`,
        });

    if (authError) {
        throw new Error("招待メールの送信に失敗しました: " + authError.message);
    }

    if (!authUser.user) {
        throw new Error("ユーザーが作成されませんでした");
    }

    // 2. employeesテーブルへ登録
    const { error: empError } = await adminSupabase
        .from("employees")
        .insert({
            id: authUser.user.id,
            tenant_id: tenantId,
            name: name,
            app_role: appRole,
            division_id: divisionId,
        });

    if (empError) {
        throw new Error(
            "従業員データの作成に失敗しました: " + empError.message,
        );
    }

    return authUser.user.id;
}
