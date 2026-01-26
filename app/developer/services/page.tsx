import { getServiceCategories, getServices } from "./actions";
import { CategoryManager } from "./_components/category-manager";
import { ServiceManager } from "./_components/service-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Blocks } from "lucide-react";

export default async function ServicesPage() {
    // データを並列取得
    const [categories, services] = await Promise.all([
        getServiceCategories(),
        getServices(),
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
                </TabsList>

                <TabsContent value="services" className="space-y-4">
                    <ServiceManager services={services || []} categories={categories || []} />
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    <CategoryManager categories={categories || []} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
