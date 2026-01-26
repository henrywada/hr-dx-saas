import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { EmployeeManager } from "./_components/employee-manager";

import { createAdminClient } from "@/utils/supabase/admin";

export default async function EmployeesPage() {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    const { data: currentEmployee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!currentEmployee?.tenant_id) {
        return <div>Error: No tenant found.</div>;
    }

    const [divisionsResult, employeesResult] = await Promise.all([
        supabase
            .from("divisions")
            .select("id, name, code, layer, parent_id")
            .eq("tenant_id", currentEmployee.tenant_id)
            .order("layer", { ascending: true })
            .order("code", { ascending: true, nullsFirst: false })
            .order("name", { ascending: true }),
        supabase
            .from("employees")
            .select("*")
            .eq("tenant_id", currentEmployee.tenant_id)
            .order("name", { ascending: true })
    ]);

    // Authユーザー一覧を取得してメールアドレスを結合
    const { data: { users }, error: usersError } = await adminSupabase.auth.admin.listUsers();
    
    if (usersError) {
        console.error("Failed to fetch auth users:", usersError);
    }

    const employeesWithEmail = (employeesResult.data || []).map(emp => {
        const authUser = users?.find(u => u.id === emp.id);
        return {
            ...emp,
            email: authUser?.email || emp.email || "メール不明", // Authのメールを優先、なければDBのメール、それもなければエラー表示
            last_sign_in_at: authUser?.last_sign_in_at || null,
        };
    });

    return (
        <EmployeeManager
            employees={employeesWithEmail}
            divisions={divisionsResult.data || []}
        />
    );
}
