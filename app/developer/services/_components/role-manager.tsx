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
import { Plus, Edit } from "lucide-react";
import { RoleDialog } from "./role-dialog";

interface Service {
    id: string;
    name: string;
}

interface AppRole {
    app_role: string;
    name: string;
    services?: Service[];
}

interface RoleManagerProps {
    roles: AppRole[];
    services: Service[];
}

export function RoleManager({ roles, services }: RoleManagerProps) {
    const [editRole, setEditRole] = useState<AppRole | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleEdit = (role: AppRole) => {
        setEditRole(role);
        setIsDialogOpen(true);
    };



    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditRole(null);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Role Management</CardTitle>
                        <CardDescription>
                            アプリケーションのロールを管理します。
                        </CardDescription>
                    </div>
                    <RoleDialog
                         role={editRole}
                         allRoles={roles}
                         services={services}
                         isOpen={isDialogOpen}
                         onClose={handleDialogClose}
                         trigger={
                            <Button onClick={() => {
                                setEditRole(null);
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
                            <TableHead className="w-[150px]">App Role (ID)</TableHead>
                            <TableHead className="w-[200px]">Role Name</TableHead>
                            <TableHead>Linked Services</TableHead>
                            <TableHead className="w-[100px]">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                    ロールが登録されていません
                                </TableCell>
                            </TableRow>
                        ) : (
                            roles.map((role) => (
                                <TableRow key={role.app_role}>
                                    <TableCell className="font-medium">{role.app_role}</TableCell>
                                    <TableCell>{role.name}</TableCell>
                                    <TableCell>
                                        {role.services && role.services.length > 0 
                                            ? (
                                                <div className="space-y-1">
                                                    {Array.from({ length: Math.ceil(role.services.length / 5) }).map((_, i) => (
                                                        <div key={i}>
                                                            {role.services!
                                                                .slice(i * 5, (i + 1) * 5)
                                                                .map(s => s.name)
                                                                .join(", ")}
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                            : <span className="text-muted-foreground text-sm">なし</span>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(role)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>

                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
