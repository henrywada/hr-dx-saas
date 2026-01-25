import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { EmployeeManager } from "./_components/employee-manager";

export default async function EmployeesPage() {
    const supabase = await createClient();

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

    return (
        <EmployeeManager
            employees={employeesResult.data || []}
            divisions={divisionsResult.data || []}
        />
    );
}
