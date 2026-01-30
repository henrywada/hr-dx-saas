"use server";

import { createClient } from "@/utils/supabase/server";

export interface PortalService {
    name: string; // Service Name (Bold)
    title?: string; // Cache Phrase / Sub Title (Bold)
    description: string;
    category?: string; // Service-specific category label (Badge)
    route_path: string;
    icon?: string; // Icon name if we decide to store it
    badge_text?: string; // Fallback to service_category name
}

export interface PortalCategory {
    id: string;
    name: string;
    description?: string;
    sort_order: number;
    services: PortalService[];
}

export async function getPortalMenuData(): Promise<PortalCategory[]> {
    const supabase = await createClient();

    // 1. Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    // 2. Get employee info (tenant_id)
    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee?.tenant_id) {
        return [];
    }

    const tenantId = employee.tenant_id;

    // 3. Fetch Service Categories
    const { data: categories, error: catError } = await supabase
        .from("service_category")
        .select("id, name, description, sort_order")
        .order("sort_order", { ascending: true });

    if (catError || !categories) {
        console.error("Error fetching categories:", catError);
        return [];
    }

    // 4. Fetch Active Services for this Tenant
    const { data: services, error: svcError } = await supabase
        .from("service")
        .select(`
      id,
      name,
      title,
      description,
      service_category_id,
      category,
      route_path,
      target_audience,
      sort_order,
      tenant_service!inner (
        status,
        tenant_id
      )
    `)
        .eq("tenant_service.tenant_id", tenantId)
        .eq("tenant_service.status", "active")
        .eq("target_audience", "all_users")
        .order("sort_order", { ascending: true });

    if (svcError || !services) {
        console.error("Error fetching services:", svcError);
        return [];
    }

    // 5. Group Services by Category
    const menuData: PortalCategory[] = categories.map((cat) => {
        const catServices = services
            .filter((svc) => svc.service_category_id === cat.id)
            .map((svc) => ({
                name: svc.name,
                title: svc.title, // Add title
                description: svc.description || "",
                category: svc.category, // Service specific category label
                route_path: svc.route_path || "/portal",
                badge_text: cat.name, // Fallback
            }));

        return {
            id: cat.id,
            name: cat.name,
            description: cat.description || "",
            sort_order: cat.sort_order || 0,
            services: catServices,
        };
    }).filter((cat) => cat.services.length > 0);

    return menuData;
}
