"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertAppRole } from "../actions";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Service {
    id: string;
    name: string;
    target_audience?: "all_users" | "admins_only" | null;
}

interface AppRole {
    app_role: string;
    name: string;
    services?: Service[];
}

interface RoleDialogProps {
    role?: AppRole | null;
    allRoles?: AppRole[];
    services: Service[];
    trigger?: React.ReactNode;
    isOpen?: boolean;
    onClose?: () => void;
}

export function RoleDialog({ role, allRoles = [], services, trigger, isOpen, onClose }: RoleDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    
    // New State for App Role Selection
    const [selectedAppRole, setSelectedAppRole] = useState<string>("");
    const [roleName, setRoleName] = useState<string>("");

    // Filter services for admins_only
    const adminServices = services.filter(s => s.target_audience === "admins_only");

    useEffect(() => {
        if (isOpen !== undefined) {
            setOpen(isOpen);
        }
        if (isOpen) {
            if (role) {
                // Edit mode: Pre-fill
                setSelectedAppRole(role.app_role);
                setRoleName(role.name);
                setSelectedServiceIds(role.services?.map(s => s.id) || []);
            } else {
                // New mode: Reset
                setSelectedAppRole("");
                setRoleName("");
                setSelectedServiceIds([]);
            }
        }
    }, [isOpen, role]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen && onClose) {
            onClose();
        }
    };

    const handleAppRoleChange = (value: string) => {
        setSelectedAppRole(value);
        // Find name from allRoles and set it
        const selectedRole = allRoles.find(r => r.app_role === value);
        if (selectedRole) {
            setRoleName(selectedRole.name);
        } 
    };

    const handleServiceToggle = (serviceId: string) => {
        setSelectedServiceIds(prev => 
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!selectedAppRole) {
            setError("App Role (ID)を選択してください");
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append("app_role", selectedAppRole);
        formData.append("name", roleName); 
        formData.append("service_ids", JSON.stringify(selectedServiceIds));

        try {
            const result = await upsertAppRole(formData);

            if (result?.error) {
                setError(result.error);
            } else {
                handleOpenChange(false);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{role ? "ロール編集" : "ロール登録"}</DialogTitle>
                    <DialogDescription>
                        ロール情報を入力してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <Label htmlFor="app_role">App Role (ID) <span className="text-red-500">*</span></Label>
                        {role ? (
                            // Edit Mode: Read-only Input
                            <Input 
                                id="app_role" 
                                value={selectedAppRole} 
                                disabled 
                                className="bg-muted"
                            />
                        ) : (
                            // New Mode: Select
                            <Select 
                                value={selectedAppRole} 
                                onValueChange={handleAppRoleChange}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="ロールIDを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allRoles.map(r => (
                                        <SelectItem key={r.app_role} value={r.app_role}>
                                            {r.app_role}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <p className="text-xs text-muted-foreground">
                            システム内部で使用される一意な識別子です。作成後は変更できません。
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">ロール名 <span className="text-red-500">*</span></Label>
                        <Input
                            id="name"
                            name="name"
                            value={roleName}
                            readOnly
                            placeholder="ロール名（自動表示）"
                            className="bg-muted"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>対象サービス</Label>
                        <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                            <div className="space-y-4">
                                {adminServices.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center">
                                        管理者向けサービスがありません
                                    </p>
                                ) : (
                                    adminServices.map((service) => (
                                        <div key={service.id} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`service-${service.id}`}
                                                checked={selectedServiceIds.includes(service.id)}
                                                onCheckedChange={() => handleServiceToggle(service.id)}
                                            />
                                            <label
                                                htmlFor={`service-${service.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {service.name}
                                            </label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {role ? "更新" : "登録"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
