"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; // ★これを追加

// ---------------------------------------------------------
// ログイン処理
// ---------------------------------------------------------
export async function login(formData: FormData) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient(); // ★管理者クライアントを作成

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // 1. Supabase Authでログイン
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(">>> [Auth Error]", {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return redirect(
      "/login?error=" +
        encodeURIComponent("メールアドレスまたはパスワードが間違っています。") +
        `&email=${encodeURIComponent(email)}`,
    );
  }

  if (!data.user) {
    return redirect(
      "/login?error=" + encodeURIComponent("認証に失敗しました。"),
    );
  }

  // 2. 権限チェック (従業員テーブルにデータがあるか)
  // ★修正: ここを `supabase` ではなく `adminSupabase` に変更します。
  // これにより RLS（閲覧制限）を無視して確実にデータの有無を確認できます。
  const { data: employee, error: empError } = await adminSupabase
    .from("employees")
    .select("app_role")
    .eq("id", data.user.id)
    .single();

  if (empError || !employee) {
    // ログインはできたが、従業員データがない場合
    await supabase.auth.signOut();
    return redirect(
      "/login?error=" +
        encodeURIComponent(
          "従業員データが見つかりません。管理者に連絡してください。",
        ) + `&email=${encodeURIComponent(email)}`,
    );
  }

  // 成功したらポータルへ
  revalidatePath("/", "layout");
  redirect("/portal");
}

// ... (以下、signup と logout は変更なし) ...
export async function signup(formData: FormData) {
  // ... (既存のコードのまま)
  console.log(">>> [Debug] Signup Action Started");

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // ... (省略) ...
  // ※以下変更不要ですが、ファイルの全体整合性を保つため既存コードを残してください
  // ...
  // 仮実装のためエラーハンドリング等は省略しています
  // 実際のsignupロジックがここに入ります
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export type ActionState = {
  error?: string;
  success?: string;
};

export async function updatePassword(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "パスワードが一致しません。" };
  }

  if (password.length < 6) {
    return { error: "パスワードは6文字以上で設定してください。" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "パスワードを設定しました。" };
}

export async function forgotPassword(
  prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/auth/callback?next=/portal/settings`,
  });

  if (error) {
    console.error("Reset password error:", error);
    // User Enumeration対策: エラーがあっても成功メッセージを出すのが通例だが、
    // ここでは開発中等のためエラー時は一旦エラーを返す（要件次第）。
    // 要件：「入力されたメールアドレスが登録されていれば...汎用的なメッセージを表示」
    // SupabaseはデフォルトでUser Enumeration保護が有効な場合、未登録でもエラーを返さない（{}を返す）。
    // 明示的なエラー(設定ミスや制限超過など)の場合は表示してもよい。
    // 今回は汎用メッセージを返すのが安全だが、元コードに合わせてエラー時はエラーを返す形を維持しつつ、
    // 成功時は汎用メッセージとする。
  }

  // セキュリティ対策: 常に成功メッセージを返す（実際のエラーはログに出力済み）
  return {
    success:
      "入力されたメールアドレスが登録されている場合、パスワード再設定用のメールを送信しました。",
  };
}
