'use server';

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getWorkflows() {
    const supabase = await createClient();
    const { data: workflows, error } = await supabase
        .from("workflows")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching workflows:", error);
        return [];
    }

    return workflows;
}

export async function createWorkflow(formData: FormData) {
    const supabase = await createClient();
    
    // Auth check (optional but good practice, though RLS handles security)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const status = formData.get("status") as string || "draft";

    if (!name) {
        throw new Error("Name is required");
    }

    const { error } = await supabase
        .from("workflows")
        .insert({
            name,
            description,
            status,
        });

    if (error) {
        console.error("Error creating workflow:", error);
        throw new Error(`Failed to create workflow: ${error.message}`);
    }

    revalidatePath("/dashboard/workflows");
}
