'use server';

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export type State = {
    error?: string;
    success?: boolean;
    message?: string;
};

// 会社（テナント）と管理者（契約者）を一括登録する
export async function registerCompany(prevState: State, formData: FormData): Promise<State> {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. 実行者の権限チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "ログインしてください。" };

    // 簡易チェック: 本来はRole='developer'をチェックすべきですが、
    // まずは誰でも登録できるようにして、後で制限をかけます。
    // const { data: actor } = await supabase.from('employees').select('role').eq('id', user.id).single();
    // if (actor?.role !== 'developer') return { error: "権限がありません。" };

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
            .insert({ name: companyName })
            .select()
            .single();

        if (tenantError) throw new Error("会社の作成に失敗: " + tenantError.message);

        // 3. Authユーザーの作成（招待メール送信）
        
        // リダイレクトURLの決定
        // 開発環境(development)であれば、環境変数の設定ミス等を防ぐため無条件で http://localhost:3000 を使用する
        const isDevelopment = process.env.NODE_ENV === 'development';
        const siteUrl = isDevelopment 
            ? 'http://localhost:3000' 
            : (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');

        const redirectUrl = `${siteUrl}/auth/callback`;

        // inviteUserByEmailを使うことで、Supabaseから自動的に招待メールが飛びます。
        const { data: authUser, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(
            adminEmail,
            {
                data: {
                    tenant_id: tenant.id // メタデータにテナントIDを埋め込む
                },
                redirectTo: redirectUrl
            }
        );

        if (authError) throw new Error("招待メールの送信に失敗: " + authError.message);
        if (!authUser.user) throw new Error("ユーザーが作成されませんでした");

        // 4. Employeesテーブルへの登録
        const { error: empError } = await adminSupabase
            .from("employees")
            .insert({
                id: authUser.user.id,
                tenant_id: tenant.id,
                name: adminName,
                email: adminEmail,
                role: 'hr_manager', // 最初の契約者は人事マネージャー権限とする
            });

        if (empError) throw new Error("従業員データの作成に失敗: " + empError.message);

    } catch (e: any) {
        console.error(e);
        return { error: e.message };
    }

    return { success: true, message: `「${companyName}」と管理者を登録しました。契約者にメール通知を行ってください。` };
}