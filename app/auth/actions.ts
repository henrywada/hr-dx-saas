"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

// ---------------------------------------------------------
// ログイン処理 (修正版: シンプルなFormData受け取り)
// ---------------------------------------------------------
export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 1. Supabase Authでログイン
    const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // エラー時はログイン画面に戻し、URLにエラー内容を付ける
        return redirect("/login?error=" + encodeURIComponent("メールアドレスまたはパスワードが間違っています。"));
    }

    if (!data.user) {
        return redirect("/login?error=" + encodeURIComponent("認証に失敗しました。"));
    }

    // 2. 権限チェック (従業員テーブルにデータがあるか)
    const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (empError || !employee) {
        // ログインはできたが、従業員データがない場合はログアウトさせる
        await supabase.auth.signOut();
        return redirect("/login?error=" + encodeURIComponent("従業員データが見つかりません。管理者に連絡してください。"));
    }

    // 成功したらポータルへ
    revalidatePath("/", "layout");
    redirect("/portal");
}

// ---------------------------------------------------------
// 新規登録処理
// ---------------------------------------------------------
export async function signup(formData: FormData) {
    console.log(">>> [Debug] Signup Action Started");

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const companyName = (formData.get("companyName") as string) || "My Company";
    const userName = (formData.get("userName") as string) || "Admin User";

    // 1. Authユーザー登録
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        return redirect("/signup?error=" + encodeURIComponent("登録エラー: " + authError.message));
    }

    if (!authData.user) {
        return redirect("/signup?error=" + encodeURIComponent("ユーザー作成に失敗しました。"));
    }

    // 2. テナントと従業員データの作成
    try {
        const { data: tenant, error: tenantError } = await adminSupabase
            .from("tenants")
            .insert({ name: companyName })
            .select()
            .single();

        if (tenantError) throw new Error(tenantError.message);

        const { error: employeeError } = await adminSupabase
            .from("employees")
            .insert({
                id: authData.user.id,
                tenant_id: tenant.id,
                name: userName,
                role: "admin",
            });

        if (employeeError) throw new Error(employeeError.message);

    } catch (err: any) {
        console.error("Signup DB Error:", err);
        return redirect("/signup?error=" + encodeURIComponent("初期化失敗: " + err.message));
    }

    revalidatePath("/", "layout");
    redirect("/portal");
}

// ---------------------------------------------------------
// ログアウト処理
// ---------------------------------------------------------
export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/login");
}