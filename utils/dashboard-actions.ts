"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { LayoutDashboard } from "lucide-react";

export interface DashboardMenuItem {
    title: string;
    href: string;
    icon?: any; // Lucide icon or string
    separator?: boolean;
    adminOnly?: boolean; // For legacy check, logic moved to DB
}

export async function setDashboardMode(mode: "company" | "saas") {
    const cookieStore = await cookies();
    cookieStore.set("dashboard_mode", mode, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
    }); // 30 days
    redirect("/dashboard");
}

export async function getDashboardMenuData() {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const dashboardMode = cookieStore.get("dashboard_mode")?.value || "company"; // Default to company if missing

    // 1. Get current user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { menuItems: [], role: null, isSaaSAdmin: false };
    }

    // 2. Get employee info (role & tenant_id)
    const { data: employee } = await supabase
        .from("employees")
        .select("app_role, tenant_id")
        .eq("id", user.id)
        .single();

    const role = employee?.app_role || "";
    const tenantId = employee?.tenant_id;

    // Determine availability
    const canAccessSaaS = role === "saas_adm" || role === "developer";
    const isSaaSAdminMode = dashboardMode === "saas" && canAccessSaaS;

    // 3. Define Base Items
    const baseItems: DashboardMenuItem[] = [
        {
            title: "Home",
            href: "/dashboard",
            icon: "LayoutDashboard",
        },
    ];

    // 4. Fetch Services via Tenant Service
    // "tenant_service"で該当のテナントのサービスを抽出
    if (!tenantId) {
        return { menuItems: baseItems, role, isSaaSAdmin: isSaaSAdminMode };
    }

    let query = supabase
        .from("tenant_service")
        .select(`
      service (
        name,
        route_path,
        target_audience,
        sort_order,
        release_status,
        description,
        title,
        service_category (
            id,
            name,
            sort_order
        )
      )
    `)
        .eq("tenant_id", tenantId)
        .eq("service.release_status", "released");

    const { data: tenantServices, error } = await query;

    if (error) {
        console.error("Error fetching dashboard menu:", error);
    }

    const targetAudienceFilter = isSaaSAdminMode ? "saas_adm" : "admins_only";

    // Flatten and Filter Services
    const validServices = (tenantServices || [])
        .flatMap((ts: any) => ts.service)
        .filter((svc: any) =>
            svc && svc.target_audience === targetAudienceFilter
        )
        // Sort services by their own order to pick the "first" one correctly if needed
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

    // Group by Category
    const categoryMap = new Map<
        string,
        { id: string; name: string; sort_order: number; href: string }
    >();

    validServices.forEach((svc: any) => {
        const cat = svc.service_category;
        if (cat && !categoryMap.has(cat.name)) {
            // Register category only once
            categoryMap.set(cat.name, {
                id: cat.id,
                name: cat.name,
                sort_order: cat.sort_order || 0,
                href: `/dashboard/category/${cat.id}`, // Link to Category Page
            });
        }
    });

    // Convert to Array and Sort by Category Sort Order
    const dynamicItems: DashboardMenuItem[] = Array.from(categoryMap.values())
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((cat) => ({
            title: cat.name,
            href: cat.href,
            icon: "Box", // Default icon
        }));

    // 5. Footer Items
    const footerItems: DashboardMenuItem[] = [
        {
            title: "ポータルへ戻る",
            href: "/portal",
            icon: "ArrowLeftCircle",
            separator: true,
        },
    ];

    return {
        menuItems: [...baseItems, ...dynamicItems, ...footerItems],
        role,
        isSaaSAdmin: isSaaSAdminMode,
    };
}

export async function getDashboardHeaderData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: employee } = await supabase
        .from("employees")
        .select(`
      name,
      app_role,
      tenants (
        name
      )
    `)
        .eq("id", user.id)
        .single();

    if (!employee) return null;

    // Fetch Role Name from app_role table
    const { data: roleData } = await supabase
        .from("app_role")
        .select("name")
        .eq("app_role", employee.app_role)
        .single();

    return {
        tenantName: employee.tenants?.name || "Unknown Tenant",
        userName: employee.name || user.email || "Guest",
        roleName: roleData?.name || employee.app_role,
    };
}

export async function getCompanyDashboardStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id, tenants(name)")
        .eq("id", user.id)
        .single();

    if (!employee || !employee.tenant_id) return null;

    const tenantId = employee.tenant_id;
    // @ts-ignore
    const tenantName = employee.tenants?.name || "未設定";

    // 1. Employee Count
    const { count: employeeCount } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

    // 2. Division Count
    const { count: divisionCount } = await supabase
        .from("divisions")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

    // 3. Active Services Count
    const { count: activeServices } = await supabase
        .from("tenant_service")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active");

    return {
        tenantName,
        employeeCount: employeeCount || 0,
        divisionCount: divisionCount || 0,
        activeServices: activeServices || 0,
    };
}

export async function getSaaSDashboardStats() {
    const supabase = await createClient();

    // Total Tenants
    const { count: tenantCount } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true });

    return {
        tenantCount: tenantCount || 0,
        systemHealth: "Normal",
    };
}

export async function getSaaSTenantList() {
    const supabase = await createClient();

    const { data: tenants, error } = await supabase
        .from("tenants")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching tenant list:", error);
        return [];
    }

    return tenants;
}

export async function getDashboardServicesForCategory(categoryId: string) {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const dashboardMode = cookieStore.get("dashboard_mode")?.value || "company";

    // 1. Get current user & tenant
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: employee } = await supabase
        .from("employees")
        .select("app_role, tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee || !employee.tenant_id) return null;

    const tenantId = employee.tenant_id;
    const role = employee.app_role;

    // 2. Determine Availability
    const canAccessSaaS = role === "saas_adm" || role === "developer";
    const isSaaSAdminMode = dashboardMode === "saas" && canAccessSaaS;
    const targetAudienceFilter = isSaaSAdminMode ? "saas_adm" : "admins_only";

    // 3. Fetch Category Info
    const { data: category } = await supabase
        .from("service_category")
        .select("name, description")
        .eq("id", categoryId)
        .single();

    if (!category) return null;

    // 4. Fetch Services
    const { data: tenantServices, error } = await supabase
        .from("tenant_service")
        .select(`
          service (
            name,
            route_path,
            target_audience,
            sort_order,
            release_status,
            description,
            title,
            category,
            service_category_id
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("service.release_status", "released")
        .eq("service.service_category_id", categoryId)
        .eq("service.target_audience", targetAudienceFilter)
        .order("service(sort_order)", { ascending: true });

    if (error) {
        console.error("Error fetching category services:", error);
        return null;
    }

    const services = (tenantServices || [])
        .flatMap((ts: any) => ts.service)
        .filter((svc: any) => svc !== null) // Ensure no nulls
        // Double check logical filtering if needed, though query covers it
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

    return {
        categoryName: category.name,
        categoryDescription: category.description,
        services: services,
    };
}
