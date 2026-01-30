"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { deleteService } from "../actions";
import { ServiceDialog } from "./service-dialog";
import { Badge } from "@/components/ui/badge";


interface Category {
    id: string;
    name: string;
}

interface Service {
    id: string;
    name: string;
    title: string | null;
    description: string | null;
    service_category_id: string;
    category: string | null;
    service_category?: {
        sort_order: number;
    };
    sort_order?: number;
    route_path?: string | null;
    release_status?: "released" | "unreleased" | null;
    target_audience?: "all_users" | "admins_only" | "saas_adm" | null;
}

interface ServiceManagerProps {
    services: Service[];
    categories: Category[];
}

export function ServiceManager({ services, categories }: ServiceManagerProps) {
    const [editService, setEditService] = useState<Service | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleEdit = (service: Service) => {
        setEditService(service);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`サービス「${name}」を削除してもよろしいですか？`)) {
            await deleteService(id);
        }
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditService(null);
    };

    const sortedServices = [...services].sort((a, b) => {
        // First sort by Category Sort Order
        const catOrderA = a.service_category?.sort_order ?? 0;
        const catOrderB = b.service_category?.sort_order ?? 0;
        if (catOrderA !== catOrderB) return catOrderA - catOrderB;

        // Then by Service Sort Order
        const orderA = a.sort_order ?? 0;
        const orderB = b.sort_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        
        // Fallback to name
        return a.name.localeCompare(b.name, "ja");
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>サービス管理</CardTitle>
                        <CardDescription>
                            システムに登録されているサービスを管理します。
                        </CardDescription>
                    </div>
                    <ServiceDialog
                         service={editService}
                         categories={categories}
                         isOpen={isDialogOpen}
                         onClose={handleDialogClose}
                         trigger={
                            <Button onClick={() => {
                                setEditService(null);
                                setIsDialogOpen(true);
                            }}>
                                <Plus className="mr-2 h-4 w-4" />
                                新規登録
                            </Button>
                         }
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">C.順序</TableHead>

                            <TableHead className="w-[150px]">カテゴリー</TableHead>
                            <TableHead className="w-[60px]">S.順序</TableHead>
                            <TableHead>サービス名</TableHead>
                            <TableHead>遷移先パス</TableHead>
                            <TableHead className="w-[100px]">リリース</TableHead>
                            <TableHead className="w-[120px]">利用対象</TableHead>
                            <TableHead className="w-[80px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                                    サービスが登録されていません
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedServices.map((service, index) => {
                                const isSameCategory = index > 0 && (service.category === sortedServices[index - 1].category);
                                return (
                                    <TableRow key={service.id}>
                                        <TableCell className="align-top text-muted-foreground">
                                            {!isSameCategory && (service.service_category?.sort_order || 0)}
                                        </TableCell>

                                        <TableCell className="font-medium align-top">
                                            {!isSameCategory && (service.category || "カテゴリー不明")}
                                        </TableCell>
                                        <TableCell className="align-top">{service.sort_order || 0}</TableCell>
                                        <TableCell className="font-medium align-top">{service.name}</TableCell>
                                        <TableCell className="text-sm align-top text-muted-foreground">{service.route_path || "-"}</TableCell>
                                        <TableCell className="align-top">
                                            {service.release_status === "released" ? (
                                                <Badge variant="default" className="bg-green-600">公開中</Badge>
                                            ) : (
                                                <Badge variant="secondary">未公開</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm align-top">
                                            {service.target_audience === "admins_only" 
                                                ? "管理者のみ" 
                                                : service.target_audience === "saas_adm"
                                                    ? "SaaS管理者"
                                                    : "全ユーザー"
                                            }
                                        </TableCell>

                                        <TableCell className="align-top">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(service)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(service.id, service.name)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>

                </Table>
            </CardContent>
        </Card>
    );
}
