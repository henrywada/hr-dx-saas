"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; // RLS回避用（必要に応じて）
import { revalidatePath } from "next/cache";
import { Division } from "./types";

export type State = {
    error?: string;
    message?: string;
    success?: boolean;
};

export async function getDivisions(): Promise<Division[]> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee?.tenant_id) return [];

    const { data, error } = await supabase
        .from("divisions")
        .select("*")
        .eq("tenant_id", employee.tenant_id)
        .order("layer", { ascending: true })
        .order("code", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching divisions:", error);
        return [];
    }
    return data as Division[];
}

export async function getDivisionsWithEmployees() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { divisions: [], employees: [] };

    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee?.tenant_id) return { divisions: [], employees: [] };

    const [divisionsResult, employeesResult] = await Promise.all([
        supabase
            .from("divisions")
            .select("*")
            .eq("tenant_id", employee.tenant_id)
            .order("layer", { ascending: true })
            .order("code", { ascending: true, nullsFirst: false })
            .order("name", { ascending: true }),
        supabase
            .from("employees")
            .select("*")
            .eq("tenant_id", employee.tenant_id)
            .order("name", { ascending: true }),
    ]);

    if (divisionsResult.error) {
        console.error("Error fetching divisions:", divisionsResult.error);
    }
    if (employeesResult.error) {
        console.error("Error fetching employees:", employeesResult.error);
    }

    return {
        divisions: (divisionsResult.data || []) as Division[],
        employees: employeesResult.data || [],
    };
}

// 部署の登録・更新 (Upsert)
export async function upsertDivision(
    prevState: State,
    formData: FormData,
): Promise<State> {
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

    if (!employee?.tenant_id) {
        return { error: "所属テナントが見つかりません。" };
    }

    // 2. フォームデータの取得
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const code = formData.get("code") as string;
    const layerStr = formData.get("layer") as string;

    // "root" という値が送られてきたら null (親なし) とする
    const rawParentId = formData.get("parent_id") as string;
    const parent_id = (rawParentId === "root" || rawParentId === "")
        ? null
        : rawParentId;

    if (!name) return { error: "部署名は必須です。" };
    if (!layerStr) return { error: "レイヤーは必須です。" };

    const layer = parseInt(layerStr, 10);
    if (isNaN(layer) || layer < 1 || layer > 10) {
        return { error: "レイヤーは1〜10の範囲で指定してください。" };
    }

    // 3. 親部署との整合性チェック
    if (parent_id) {
        const { data: parent } = await adminSupabase
            .from("divisions")
            .select("layer")
            .eq("id", parent_id)
            .single();

        if (!parent) {
            return { error: "親部署が見つかりません。" };
        }

        // 親のレイヤーが子よりも小さいことを確認
        if (parent.layer >= layer) {
            return {
                error:
                    `親部署（レイヤー${parent.layer}）よりも下位のレイヤー（${
                        layer + 1
                    }以上）を選択してください。`,
            };
        }
    } else {
        // 親がない場合はレイヤー1でなければならない
        if (layer !== 1) {
            return { error: "親部署がない場合、レイヤー1を選択してください。" };
        }
    }

    // 4. DB保存 (Upsert)
    const payload = {
        tenant_id: employee.tenant_id,
        name,
        code: code || null,
        parent_id,
        layer,
        ...(id ? { id } : {}), // IDがあれば更新、なければ新規作成
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
        .select("*", { count: "exact", head: true })
        .eq("parent_id", id);

    if (count && count > 0) {
        throw new Error(
            "下位部署が存在するため削除できません。先に下位部署を削除または移動してください。",
        );
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
