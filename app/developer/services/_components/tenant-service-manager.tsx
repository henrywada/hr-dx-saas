"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save } from "lucide-react";
import { getTenantServices, updateTenantServices } from "../actions";

interface Service {
    id: string;
    name: string;
    description: string | null;
    service_category_id: string;
    category: string | null;
    sort_order?: number;
    service_category?: {
        id: string;
        name: string;
        sort_order?: number;
    } | null;
}

interface Tenant {
    id: string;
    name: string;
}

interface TenantServiceManagerProps {
    services: Service[];
    tenants: Tenant[];
}

export function TenantServiceManager({ services, tenants }: TenantServiceManagerProps) {
    const [selectedTenantId, setSelectedTenantId] = useState<string>("");
    const [checkedServiceIds, setCheckedServiceIds] = useState<string[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [isSaving, startTransition] = useTransition();

    // Sort services: Category Sort Order -> Service Sort Order
    const sortedServices = [...services].sort((a, b) => {
        const catOrderA = a.service_category?.sort_order || 0;
        const catOrderB = b.service_category?.sort_order || 0;
        
        if (catOrderA !== catOrderB) return catOrderA - catOrderB;
        
        const serviceOrderA = a.sort_order || 0;
        const serviceOrderB = b.sort_order || 0;
        
        return serviceOrderA - serviceOrderB;
    });

    useEffect(() => {
        if (!selectedTenantId) {
            setCheckedServiceIds([]);
            return;
        }

        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const activeIds = await getTenantServices(selectedTenantId);
                setCheckedServiceIds(activeIds);
            } catch (error) {
                console.error("Failed to fetch tenant services", error);
                alert("データの取得に失敗しました");
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [selectedTenantId]);

    const handleToggleService = (serviceId: string) => {
        setCheckedServiceIds((prev) =>
            prev.includes(serviceId)
                ? prev.filter((id) => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleSave = () => {
        if (!selectedTenantId) return;

        startTransition(async () => {
             const result = await updateTenantServices(selectedTenantId, checkedServiceIds);
             if (result.error) {
                 alert(`エラー: ${result.error}`);
             } else {
                 alert("保存完了: テナントの利用サービスを更新しました。");
             }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tenant Service Management</CardTitle>
                <CardDescription>
                    各テナントで有効にするサービスを管理します。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        対象テナント
                    </label>
                    <Select
                        value={selectedTenantId}
                        onValueChange={setSelectedTenantId}
                    >
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder="テナントを選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                            {tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                    {tenant.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedTenantId && (
                    <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">利用可能サービス</h3>
                            <Button onClick={handleSave} disabled={isSaving || isLoadingData}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                保存
                            </Button>
                        </div>

                        {isLoadingData ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <ScrollArea className="h-[400px] border rounded-md p-4">
                                <div className="space-y-4">
                                    {sortedServices.map((service) => (
                                        <div key={service.id} className="flex items-center space-x-2 border-b last:border-0 pb-2 last:pb-0">
                                            <Checkbox
                                                id={`srv-${service.id}`}
                                                checked={checkedServiceIds.includes(service.id)}
                                                onCheckedChange={() => handleToggleService(service.id)}
                                            />
                                            <label
                                                htmlFor={`srv-${service.id}`}
                                                className="text-sm cursor-pointer flex-1"
                                            >
                                                <span className="font-semibold mr-2">[{service.service_category?.name || service.category || "未分類"}]</span>
                                                {service.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
