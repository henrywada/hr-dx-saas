import { getServiceCategories, getServices, getAppRoles, getTenants } from "./actions";
import { CategoryManager } from "./_components/category-manager";
import { ServiceManager } from "./_components/service-manager";
import { RoleManager } from "./_components/role-manager";
import { TenantServiceManager } from "./_components/tenant-service-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Blocks } from "lucide-react";

export default async function ServicesPage() {
    // データを並列取得
    const [categories, services, appRoles, tenants] = await Promise.all([
        getServiceCategories(),
        getServices(),
        getAppRoles(),
        getTenants(),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Blocks className="h-8 w-8 text-orange-600" />
                    サービス管理
                </h1>
                <p className="text-muted-foreground">
                    提供するサービスとカテゴリーの登録・編集を行います。
                </p>
            </div>

            <Tabs defaultValue="services" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="services">サービス管理</TabsTrigger>
                    <TabsTrigger value="categories">カテゴリー管理</TabsTrigger>
                    <TabsTrigger value="roles">App Role 管理</TabsTrigger>
                    <TabsTrigger value="tenant-services">Tenant Service 管理</TabsTrigger>
                </TabsList>

                <TabsContent value="services" className="space-y-4">
                    <ServiceManager 
                        services={services || []} 
                        categories={categories || []} 
                    />
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    <CategoryManager categories={categories || []} />
                </TabsContent>

                <TabsContent value="roles" className="space-y-4">
                    <RoleManager 
                        roles={appRoles || []} 
                        services={services || []} 
                    />
                </TabsContent>

                <TabsContent value="tenant-services" className="space-y-4">
                    <TenantServiceManager 
                        services={services || []}
                        tenants={tenants || []}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
