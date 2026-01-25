"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEmployee, updateEmployee } from "../actions";
import { useEffect, useState, useTransition } from "react";

type Division = {
    id: string;
    name: string;
    code: string | null;
    layer: number;
    parent_id: string | null;
};

type Employee = {
    id: string;
    name: string;
    email: string;
    app_role: string;
    division_id: string | null;
};

interface EmployeeDialogProps {
    divisions: Division[];
    editEmployee?: Employee | null;
    isOpen?: boolean;
    onClose?: () => void;
    trigger?: React.ReactNode;
}

export function EmployeeDialog({ divisions, editEmployee, isOpen, onClose, trigger }: EmployeeDialogProps) {
    const [open, setOpen] = useState(isOpen || false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("employee");
    const [divisionId, setDivisionId] = useState<string>("unassigned");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (isOpen !== undefined) {
            setOpen(isOpen);
        }
    }, [isOpen]);

    useEffect(() => {
        if (editEmployee) {
            setName(editEmployee.name);
            setEmail(editEmployee.email);
            setRole(editEmployee.app_role);
            setDivisionId(editEmployee.division_id || "unassigned");
        } else {
            setName("");
            setEmail("");
            setRole("employee");
            setDivisionId("unassigned");
        }
        setError(null);
    }, [editEmployee]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen && onClose) {
            onClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const formData = new FormData(e.currentTarget);
        
        startTransition(async () => {
            const result = editEmployee 
                ? await updateEmployee({}, formData)
                : await createEmployee({}, formData);

            if (result.error) {
                setError(result.error);
            } else if (result.success) {
                setOpen(false);
                if (onClose) onClose();
                setName("");
                setEmail("");
                setRole("employee");
                setDivisionId("unassigned");
            }
        });
    };

    // ツリー構造を構築
    const buildTree = (divs: Division[]) => {
        const map = new Map<string, Division & { children: (Division & { children: any[] })[] }>();
        const roots: (Division & { children: any[] })[] = [];

        divs.forEach(d => map.set(d.id, { ...d, children: [] }));
        divs.forEach(d => {
            const node = map.get(d.id)!;
            if (d.parent_id && map.has(d.parent_id)) {
                map.get(d.parent_id)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        const sortChildren = (nodes: any[]) => {
            nodes.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    sortChildren(node.children);
                }
            });
        };

        sortChildren(roots);

        const flatten = (nodes: any[]): Division[] => {
            const result: Division[] = [];
            nodes.forEach(node => {
                result.push(node as Division);
                if (node.children.length > 0) {
                    result.push(...flatten(node.children));
                }
            });
            return result;
        };

        return flatten(roots);
    };

    const sortedDivisions = buildTree(divisions);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {editEmployee ? "従業員情報を編集" : "新規従業員を登録"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {editEmployee && (
                        <input type="hidden" name="employee_id" value={editEmployee.id} />
                    )}
                    
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">氏名 *</Label>
                        <Input
                            id="name"
                            name="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="山田 太郎"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">メールアドレス *</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="yamada@example.com"
                            required
                            readOnly={!!editEmployee}
                            className={editEmployee ? "bg-gray-100 cursor-not-allowed" : ""}
                        />
                        {editEmployee && (
                            <p className="text-xs text-gray-500">メールアドレスは変更できません</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">役職 *</Label>
                        <Select name="role" value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="役職を選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="employee">従業員</SelectItem>
                                <SelectItem value="hr_manager">人事マネージャー</SelectItem>
                                <SelectItem value="hr">人事</SelectItem>
                                <SelectItem value="boss">上司</SelectItem>
                                <SelectItem value="company_doctor">産業医</SelectItem>
                                <SelectItem value="company_nurse">保健師</SelectItem>
                                <SelectItem value="hsc">安全衛生委員</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="division_id">所属部署</Label>
                        <Select name="division_id" value={divisionId} onValueChange={setDivisionId}>
                            <SelectTrigger>
                                <SelectValue placeholder="部署を選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">未割り当て</SelectItem>
                                {sortedDivisions.map(div => (
                                    <SelectItem key={div.id} value={div.id}>
                                        {"\u00A0\u00A0".repeat((div.layer || 1) - 1)}
{div.code ? `${div.code} ` : ''}{div.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isPending}
                        >
                            キャンセル
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-orange-600 hover:bg-orange-700"
                            disabled={isPending}
                        >
                            {isPending ? "処理中..." : (editEmployee ? "更新する" : "登録する")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
