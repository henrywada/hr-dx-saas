"use server";

import { createAdminClient, createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// --- Service Categories ---

// カテゴリー一覧取得
export async function getServiceCategories() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("service_category")
        .select("*")
        .order("sort_order")
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
    const sortOrder = parseInt((formData.get("sort_order") as string) || "0");

    if (!name) return { error: "カテゴリー名は必須です" };

    const { error } = await supabase
        .from("service_category")
        .insert({ name, description, sort_order: sortOrder });

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
    const sortOrder = parseInt((formData.get("sort_order") as string) || "0");

    if (!name) return { error: "カテゴリー名は必須です" };

    const { error } = await supabase
        .from("service_category")
        .update({ name, description, sort_order: sortOrder })
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

// --- App Role Groups ---

// --- App Roles ---

export async function getAppRoles() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("app_role")
        .select(`
            *,
            app_role_service (
                service:service_id (
                    id,
                    name,
                    sort_order
                )
            )
        `)
        .order("app_role");

    if (error) {
        console.error("Error fetching app roles:", error);
        return [];
    }

    // Flatten the structure for easier UI consumption and sort services
    return data.map((role: any) => ({
        ...role,
        services: role.app_role_service
            .map((item: any) => item.service)
            .sort((a: any, b: any) => {
                if (a.sort_order !== b.sort_order) {
                    return (a.sort_order || 0) - (b.sort_order || 0);
                }
                return a.name.localeCompare(b.name);
            }),
    }));
}

export async function upsertAppRole(formData: FormData) {
    const supabase = await createClient();
    const appRole = formData.get("app_role") as string;
    const name = formData.get("name") as string;
    const serviceIds = JSON.parse(
        formData.get("service_ids") as string,
    ) as string[];

    if (!appRole || !name) {
        return { error: "ロールIDとロール名は必須です" };
    }

    // Upsert app_role
    const { error: roleError } = await supabase
        .from("app_role")
        .upsert({
            app_role: appRole,
            name: name,
        });

    if (roleError) {
        return { error: roleError.message };
    }

    // Update service links (app_role_service)
    // First, delete existing links for this role
    const { error: deleteLinksError } = await supabase
        .from("app_role_service")
        .delete()
        .eq("app_role", appRole);

    if (deleteLinksError) {
        return { error: deleteLinksError.message };
    }

    // Then insert new links
    if (serviceIds.length > 0) {
        const linkData = serviceIds.map((serviceId) => ({
            app_role: appRole,
            service_id: serviceId,
        }));

        const { error: insertLinksError } = await supabase
            .from("app_role_service")
            .insert(linkData);

        if (insertLinksError) {
            return { error: insertLinksError.message };
        }
    }

    revalidatePath("/developer/services");
    return { success: true };
}

export async function deleteAppRole(appRole: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("app_role")
        .delete()
        .eq("app_role", appRole);

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
                name,
                sort_order
            )
        `)
        .order("sort_order")
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
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const serviceCategoryId = formData.get("service_category_id") as string;
    const sortOrder = parseInt((formData.get("sort_order") as string) || "0");
    const routePath = formData.get("route_path") as string;
    const releaseStatus = formData.get("release_status") as
        | "released"
        | "unreleased";
    const targetAudience = formData.get("target_audience") as
        | "all_users"
        | "admins_only"
        | "saas_adm";

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

    const { error } = await supabase.from("service").insert({
        name,
        title,
        description,
        service_category_id: serviceCategoryId,
        category: categoryData.name, // 冗長カラムへの保存
        sort_order: sortOrder,
        route_path: routePath,
        release_status: releaseStatus,
        target_audience: targetAudience,
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
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const serviceCategoryId = formData.get("service_category_id") as string;
    const sortOrder = parseInt((formData.get("sort_order") as string) || "0");
    const routePath = formData.get("route_path") as string;
    const releaseStatus = formData.get("release_status") as
        | "released"
        | "unreleased";
    const targetAudience = formData.get("target_audience") as
        | "all_users"
        | "admins_only"
        | "saas_adm";

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
            title,
            description,
            service_category_id: serviceCategoryId,
            category: categoryData.name,
            sort_order: sortOrder,
            route_path: routePath,
            release_status: releaseStatus,
            target_audience: targetAudience,
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

// --- Tenant Services (Super User Only) ---

async function checkSuperUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: employee } = await supabase
        .from("employees")
        .select("app_role")
        .eq("id", user.id)
        .single();

    return employee?.app_role === "developer";
}

export async function getTenants() {
    const isSuperUser = await checkSuperUser();
    if (!isSuperUser) return [];

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .order("name");

    if (error) {
        console.error("Error fetching tenants:", error);
        return [];
    }
    return data;
}

export async function getTenantServices(tenantId: string) {
    const isSuperUser = await checkSuperUser();
    if (!isSuperUser) return [];

    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from("tenant_service")
        .select("service_id")
        .eq("tenant_id", tenantId);

    if (error) {
        console.error("Error fetching tenant services:", error);
        return [];
    }
    return data.map((item: any) => item.service_id);
}

export async function updateTenantServices(
    tenantId: string,
    serviceIds: string[],
) {
    const isSuperUser = await checkSuperUser();
    if (!isSuperUser) return { error: "権限がありません" };

    const supabase = await createAdminClient();

    // 1. Delete existing services for this tenant
    const { error: deleteError } = await supabase
        .from("tenant_service")
        .delete()
        .eq("tenant_id", tenantId);

    if (deleteError) return { error: deleteError.message };

    // 2. Insert new services
    if (serviceIds.length > 0) {
        const insertData = serviceIds.map((serviceId) => ({
            tenant_id: tenantId,
            service_id: serviceId,
            start_date: new Date().toISOString(), // Default to now
            status: "active", // Default status
        }));

        const { error: insertError } = await supabase
            .from("tenant_service")
            .insert(insertData);

        if (insertError) return { error: insertError.message };
    }

    revalidatePath("/developer/services");
    return { success: true };
}
