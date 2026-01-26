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
    description: string | null;
    service_category_id: string;
    category: string | null;
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
        const catA = a.category || "";
        const catB = b.category || "";
        if (catA !== catB) return catA.localeCompare(catB, "ja");
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
                            <TableHead className="w-[300px]">カテゴリー</TableHead>
                            <TableHead>サービス名</TableHead>
                            <TableHead>説明</TableHead>
                            <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedServices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                    サービスが登録されていません
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedServices.map((service, index) => {
                                const isSameCategory = index > 0 && (service.category === sortedServices[index - 1].category);
                                return (
                                    <TableRow key={service.id}>
                                        <TableCell className="font-medium">
                                            {!isSameCategory && (service.category || "カテゴリー不明")}
                                        </TableCell>
                                        <TableCell className="font-medium">{service.name}</TableCell>
                                        <TableCell className="max-w-[300px] truncate" title={service.description || ""}>
                                            {service.description || "-"}
                                        </TableCell>
                                        <TableCell>
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
