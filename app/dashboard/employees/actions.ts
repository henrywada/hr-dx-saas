'use server';

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; // Admin権限を使用
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ... (既存の createEmployee はそのまま残す) ...

export async function createEmployee(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // 1. 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "認証されていません。" };

    // 2. データ取得
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const divisionId = formData.get("division_id") as string; // フォームから部署IDを取得

    if (!name || !email || !role) {
        return { error: "必須項目が入力されていません。" };
    }
    
    // 3. テナントID取得 (操作ユーザーの所属から)
    const { data: operator } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();
        
    if (!operator?.tenant_id) return { error: "所属テナント不明" };

    try {
        // 4. Authユーザーの作成（招待メール送信）
        // リダイレクトURLの決定
        const isDevelopment = process.env.NODE_ENV === 'development';
        const siteUrl = isDevelopment 
            ? 'http://localhost:3000' 
            : (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
        
        // 招待メールのリンク先: パスワード設定画面やポータルなど。
        // ここでは開発環境の挙動を安定させるため、会社登録時と同様の形式を採用します。
        // 必要に応じて ?next=/portal 等を追加してください。
        const redirectUrl = `${siteUrl}/auth/callback?next=/portal`;

        const { data: authUser, error: authError } = await adminSupabase.auth.admin.inviteUserByEmail(
            email,
            {
                data: {
                    tenant_id: operator.tenant_id
                },
                redirectTo: redirectUrl
            }
        );

        if (authError) {
            console.error("Invite Error:", authError);
            return { error: "招待メールの送信に失敗しました: " + authError.message };
        }
        
        if (!authUser.user) throw new Error("ユーザーが作成されませんでした");

        // 5. DB登録 (employeesテーブル)
        const { error: insertError } = await adminSupabase
            .from("employees")
            .insert({
                id: authUser.user.id, // AuthユーザーIDと紐付け
                tenant_id: operator.tenant_id,
                name: name,
                // email: email, // メールアドレスはAuth側で管理するため、employeesテーブルにemailカラムがあるか要確認。なければコメントアウト
                role: role,
                division_id: divisionId || null
            });

        if (insertError) {
            console.error("DB Insert Error:", insertError);
            // 補償トランザクション（Authユーザー削除など）が必要な場合もあるが、まずはエラー通知
            return { error: "従業員データの作成に失敗しました: " + insertError.message };
        }

    } catch (e: any) {
        console.error(e);
        return { error: e.message };
    }

    revalidatePath("/dashboard/employees");
    return { success: true, message: "招待メールを送信しました" };
}

// ▼▼ 追加: 所属部署の更新機能 ▼▼
export async function updateEmployeeDivision(employeeId: string, divisionId: string | null) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. 権限チェック (実行者がログインしているか)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    // 2. 所属の更新
    // employeesテーブルはRLSがかかっている可能性があるため、確実に更新できるようAdminクライアントを使用推奨
    // (要件に応じて通常のsupabaseクライアントでも可)
    const { error } = await adminSupabase
        .from("employees")
        .update({ 
            division_id: divisionId === "unassigned" ? null : divisionId,
            updated_at: new Date().toISOString() // 更新日時があれば
        })
        .eq("id", employeeId);

    if (error) {
        console.error("Update Division Error:", error);
        throw new Error("部署の更新に失敗しました。");
    }

    // 3. 画面の更新
    revalidatePath("/dashboard/employees");
}