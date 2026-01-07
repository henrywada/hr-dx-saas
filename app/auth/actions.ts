"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function login(prevState: { error: string } | null, formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // 1. Supabase Authでログイン
    const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // 認証エラー
        return { error: "メールアドレスまたはパスワードが間違っています。" };
    }

    if (!data.user) {
        return { error: "認証に失敗しました。" };
    }

    // 2. ログインユーザーの Role (役職) を取得
    const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (empError || !employee) {
        // データ不整合などのエラー時
        return { error: "ユーザー情報の取得に失敗しました。管理者にお問い合わせください。" };
    }

    revalidatePath("/", "layout");

    // 3. 仕様書に基づく画面遷移の分岐
    // role='company_doctor' (産業医) の場合
    if (employee.role === "company_doctor") {
        redirect("/dashboard/doctor");
    }

    // それ以外 (employee, hr, hr_manager, bossなど) は 人事DX TOPへ
    redirect("/dashboard");
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return redirect("/login?error=" + encodeURIComponent("登録処理中にエラーが発生しました: " + error.message));
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function logout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/login");
}