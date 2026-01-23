"use server";

import { createClient } from "@/utils/supabase/server";

export type ActionState = {
  error?: string;
  success?: string;
};

export async function updatePassword(prevState: ActionState, formData: FormData): Promise<ActionState> {
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

  return { success: "パスワードを更新しました。" };
}
