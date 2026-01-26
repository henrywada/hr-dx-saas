"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- Service Categories ---

// カテゴリー一覧取得
export async function getServiceCategories() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("service_category")
        .select("*")
        .order("name");

    if (error) {
        console.error("Error fetching service categories:", error);
        return [];
    }
    return data;
}

// カテゴリー作成
export async function createServiceCategory(formData: FormData) {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) return { error: "カテゴリー名は必須です" };

    const { error } = await supabase
        .from("service_category")
        .insert({ name, description });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/developer/services");
    return { success: true };
}

// カテゴリー更新
export async function updateServiceCategory(id: string, formData: FormData) {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name) return { error: "カテゴリー名は必須です" };

    const { error } = await supabase
        .from("service_category")
        .update({ name, description })
        .eq("id", id);

    if (error) {
        return { error: error.message };
    }

    // カテゴリー名が変わった場合、関連するサービスのカテゴリー名も更新する
    // 本来は外部キー制約で自動更新などが望ましいが、アプリケーション側で同期をとる
    const { error: serviceError } = await supabase
        .from("service")
        .update({ category: name })
        .eq("service_category_id", id);

    if (serviceError) {
        console.error(
            "Error updating related services category name:",
            serviceError,
        );
        // カテゴリー自体の更新は成功しているので、ここではエラーを返さない（または警告を含める）
    }

    revalidatePath("/developer/services");
    return { success: true };
}

// カテゴリー削除
export async function deleteServiceCategory(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("service_category")
        .delete()
        .eq("id", id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/developer/services");
    return { success: true };
}

// --- Services ---

// サービス一覧取得
export async function getServices() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("service")
        .select(`
            *,
            service_category:service_category_id (
                id,
                name
            )
        `)
        .order("name");

    if (error) {
        console.error("Error fetching services:", error);
        return [];
    }
    return data;
}

// サービス作成
export async function createService(formData: FormData) {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const serviceCategoryId = formData.get("service_category_id") as string;

    if (!name || !serviceCategoryId) {
        return { error: "サービス名とカテゴリーは必須です" };
    }

    // カテゴリー名を取得
    const { data: categoryData, error: categoryError } = await supabase
        .from("service_category")
        .select("name")
        .eq("id", serviceCategoryId)
        .single();

    if (categoryError || !categoryData) {
        return { error: "指定されたカテゴリーが見つかりません" };
    }

    const { error } = await supabase
        .from("service")
        .insert({
            name,
            description,
            service_category_id: serviceCategoryId,
            category: categoryData.name, // 冗長カラムへの保存
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/developer/services");
    return { success: true };
}

// サービス更新
export async function updateService(id: string, formData: FormData) {
    const supabase = await createClient();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const serviceCategoryId = formData.get("service_category_id") as string;

    if (!name || !serviceCategoryId) {
        return { error: "サービス名とカテゴリーは必須です" };
    }

    // カテゴリー名を取得
    const { data: categoryData, error: categoryError } = await supabase
        .from("service_category")
        .select("name")
        .eq("id", serviceCategoryId)
        .single();

    if (categoryError || !categoryData) {
        return { error: "指定されたカテゴリーが見つかりません" };
    }

    const { error } = await supabase
        .from("service")
        .update({
            name,
            description,
            service_category_id: serviceCategoryId,
            category: categoryData.name,
        })
        .eq("id", id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/developer/services");
    return { success: true };
}

// サービス削除
export async function deleteService(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("service")
        .delete()
        .eq("id", id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath("/developer/services");
    return { success: true };
}
