'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEmployee(formData: FormData) {
    const supabase = await createClient();

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect("/login");
    }

    // 2. Get tenant_id from current user's profile
    const { data: currentEmployee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!currentEmployee?.tenant_id) {
        throw new Error("Current user does not belong to a tenant.");
    }

    // 3. Extract form data
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const division_id = formData.get("division_id") as string;
    const role = formData.get("role") as string;

    // 4. Insert new employee
    // Note: In a real Supabase Auth setup, creating an 'employee' record usually requires
    // a corresponding 'auth.users' record if there is a FK constraint.
    // Since we don't have the Service Role key exposed here to create an Auth user,
    // we will attempt the insert. If the DB requires a valid Auth ID for the 'id' column,
    // this might fail unless we generate a UUID that happens to exist (impossible) 
    // or if the implementation ignores the FK for now (unlikely given previous instructions).
    // However, typical flow is: Invite User (Auth) -> Trigger -> Create Employee.
    // We will proceed with the requested INSERT.

    const { error } = await supabase
        .from("employees")
        .insert({
            tenant_id: currentEmployee.tenant_id,
            name,
            email,
            division_id: division_id || null,
            role,
            is_contracted_person: false,
            // We do NOT set 'id' here, letting Postgres generate it (gen_random_uuid).
            // Warning: This will fail if 'id' references auth.users(id) and the UUID doesn't exist there.
        });

    if (error) {
        console.error("Error creating employee:", error);
        // We might want to return this error to the UI, 
        // but for now we'll throw to be caught by Next.js error boundary or see in logs.
        throw new Error(`Failed to create employee: ${error.message}`);
    }

    revalidatePath("/dashboard/employees");
    redirect("/dashboard/employees");
}
