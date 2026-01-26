"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { createEmployeeUser } from "@/utils/employee";

export async function createEmployee(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "認証されていません。" };

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;
    const divisionId = formData.get("division_id") as string;

    if (!name || !email || !role) {
        return { error: "必須項目が入力されていません。" };
    }

    const { data: operator } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!operator?.tenant_id) return { error: "所属テナント不明" };

    // "unassigned"の場合はnullに変換
    const finalDivisionId = divisionId === "unassigned"
        ? null
        : (divisionId || null);

    try {
        // 従業員の作成
        await createEmployeeUser(
            adminSupabase,
            email,
            name,
            operator.tenant_id,
            role,
            finalDivisionId,
        );
    } catch (e: any) {
        console.error(e);
        return { error: e.message };
    }

    revalidatePath("/dashboard/settings/employees");
    return {
        success: true,
        message: "従業員を登録し、招待メールを送信しました。",
    };
}

export async function updateEmployeeDivision(
    employeeId: string,
    divisionId: string | null,
) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { error } = await adminSupabase
        .from("employees")
        .update({
            division_id: divisionId === "unassigned" ? null : divisionId,
        })
        .eq("id", employeeId);

    if (error) {
        console.error("Update Division Error:", error);
        throw new Error("部署の更新に失敗しました。");
    }

    revalidatePath("/dashboard/settings/employees");
}

export async function updateEmployee(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "認証されていません。" };

    const employeeId = formData.get("employee_id") as string;
    const name = formData.get("name") as string;
    const role = formData.get("role") as string;
    const divisionId = formData.get("division_id") as string;

    if (!employeeId || !name || !role) {
        return { error: "必須項目が入力されていません。" };
    }

    const { data: operator } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!operator?.tenant_id) return { error: "所属テナント不明" };

    // "unassigned"の場合はnullに変換
    const finalDivisionId = divisionId === "unassigned"
        ? null
        : (divisionId || null);

    try {
        // employeesテーブルを更新
        const { error: updateError } = await adminSupabase
            .from("employees")
            .update({
                name: name,
                app_role: role,
                division_id: finalDivisionId,
            })
            .eq("id", employeeId)
            .eq("tenant_id", operator.tenant_id);

        if (updateError) {
            console.error("Update Employee Error:", updateError);
            return {
                error: "従業員情報の更新に失敗しました: " + updateError.message,
            };
        }

        revalidatePath("/dashboard/settings/employees");
        return {
            success: true,
            message: "従業員情報を更新しました。",
        };
    } catch (e: any) {
        console.error(e);
        return { error: e.message };
    }
}

export async function deleteEmployee(employeeId: string) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("認証されていません。");
    }

    const { data: operator } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!operator?.tenant_id) {
        throw new Error("所属テナント不明");
    }

    try {
        // employeesテーブルから削除（auth.usersは残す）
        const { error: deleteError } = await adminSupabase
            .from("employees")
            .delete()
            .eq("id", employeeId)
            .eq("tenant_id", operator.tenant_id);

        if (deleteError) {
            console.error("Delete Employee Error:", deleteError);
            throw new Error(
                "従業員の削除に失敗しました: " + deleteError.message,
            );
        }

        revalidatePath("/dashboard/settings/employees");
        return {
            success: true,
            message: "従業員を削除しました。",
        };
    } catch (e: any) {
        console.error(e);
        throw new Error(e.message);
    }
}
