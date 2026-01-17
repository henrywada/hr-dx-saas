'use server';

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; // RLS回避用（必要に応じて）
import { revalidatePath } from "next/cache";
import { Division } from "./types";

export type State = {
    error?: string;
    message?: string;
    success?: boolean;
};

// 部署一覧の取得
export async function getDivisions(): Promise<Division[]> {
    const supabase = await createClient();
    
    // 1. ユーザーのテナントIDを取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee?.tenant_id) return [];

    // 2. テナントに紐づく部署を取得（階層順、名前順）
    const { data, error } = await supabase
        .from("divisions")
        .select("*")
        .eq("tenant_id", employee.tenant_id)
        .order("layer", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching divisions:", error);
        return [];
    }
    return data as Division[];
}

// 部署の登録・更新 (Upsert)
export async function upsertDivision(prevState: State, formData: FormData): Promise<State> {
    const supabase = await createClient(); 
    // 親部署の情報取得などにAdmin権限が必要な場合はこちらを使用
    const adminSupabase = createAdminClient(); 

    // 1. 認証とテナント特定
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "認証されていません。" };

    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee?.tenant_id) return { error: "所属テナントが見つかりません。" };

    // 2. フォームデータの取得
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    // "root" という値が送られてきたら null (親なし) とする
    const rawParentId = formData.get("parent_id") as string;
    const parent_id = (rawParentId === "root" || rawParentId === "") ? null : rawParentId;

    if (!name) return { error: "部署名は必須です。" };

    // 3. 階層(layer)の計算
    let layer = 1; // デフォルトはルート(1)
    if (parent_id) {
        // 親部署のlayerを取得して +1 する
        const { data: parent } = await adminSupabase
            .from("divisions")
            .select("layer")
            .eq("id", parent_id)
            .single();
        
        if (parent) {
            layer = parent.layer + 1;
        }
    }

    // 4. DB保存 (Upsert)
    const payload = {
        tenant_id: employee.tenant_id,
        name,
        code: code || null,
        parent_id,
        layer,
        ...(id ? { id } : {}) // IDがあれば更新、なければ新規作成
    };

    const { error } = await adminSupabase
        .from("divisions")
        .upsert(payload);

    if (error) {
        console.error("Upsert error:", error);
        return { error: "保存に失敗しました: " + error.message };
    }

    revalidatePath("/dashboard/settings/divisions");
    return { success: true, message: "保存しました。" };
}

// 部署の削除
export async function deleteDivision(id: string) {
    const adminSupabase = createAdminClient();
    
    // 子部署が存在するかチェック
    const { count } = await adminSupabase
        .from("divisions")
        .select("*", { count: 'exact', head: true })
        .eq("parent_id", id);

    if (count && count > 0) {
        throw new Error("下位部署が存在するため削除できません。先に下位部署を削除または移動してください。");
    }

    const { error } = await adminSupabase
        .from("divisions")
        .delete()
        .eq("id", id);

    if (error) {
        throw new Error("削除に失敗しました: " + error.message);
    }

    revalidatePath("/dashboard/settings/divisions");
}
