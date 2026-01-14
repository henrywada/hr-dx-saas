'use server';

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; // 追加
import { revalidatePath } from "next/cache";
import { Division } from "./types";

// 部署一覧取得 (読み込みは通常権限でOK)
export async function getDivisions(): Promise<Division[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("divisions")
    .select("*")
    .order("layer", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching divisions:", error);
    return [];
  }
  return data as Division[];
}

// 部署の作成・更新 (書き込みは管理者権限で行う)
export async function upsertDivision(prevState: any, formData: FormData) {
  const supabase = await createClient(); // 認証チェック用
  const adminSupabase = createAdminClient(); // 書き込み用（RLSバイパス）

  // 1. 認証とテナントID取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証されていません。" };

  /* 
     Schema changed: 'profiles' -> 'employees', 'organizations' -> 'tenants'.
     'employees' table now has 'tenant_id'.
  */
  const { data: employee } = await supabase
    .from("employees")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!employee?.tenant_id) return { error: "所属テナントが見つかりません。" };

  // 2. フォームデータ取得
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const parent_id = formData.get("parent_id") as string || null;

  if (!name) return { error: "部署名は必須です。" };

  // 3. 階層(layer)の計算
  let layer = 1;
  if (parent_id) {
    const { data: parent } = await adminSupabase // 親参照も念のためAdminで
      .from("divisions")
      .select("layer")
      .eq("id", parent_id)
      .single();
    
    if (parent) {
      layer = parent.layer + 1;
    }
  }

  // 4. Upsert実行 (Admin権限)
  const payload = {
    tenant_id: employee.tenant_id,
    name,
    code: code || null,
    parent_id: parent_id === "root" ? null : parent_id,
    layer,
    ...(id ? { id } : {})
  };

  const { error } = await adminSupabase
    .from("divisions")
    .upsert(payload);

  if (error) {
    console.error("Upsert error:", error);
    return { error: "保存に失敗しました: " + error.message };
  }

  revalidatePath("/dashboard/divisions");
  return { success: true, message: "保存しました。" };
}

// 部署の削除 (書き込みは管理者権限で行う)
export async function deleteDivision(id: string) {
  const adminSupabase = createAdminClient(); // 書き込み用
  
  // 子部署が存在するかチェック
  const { count } = await adminSupabase
    .from("divisions")
    .select("*", { count: 'exact', head: true })
    .eq("parent_id", id);

  if (count && count > 0) {
    throw new Error("下位部署が存在するため削除できません。");
  }

  const { error } = await adminSupabase
    .from("divisions")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error("削除に失敗しました: " + error.message);
  }

  revalidatePath("/dashboard/divisions");
}
