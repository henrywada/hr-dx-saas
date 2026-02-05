"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createEmployee } from "@/app/dashboard/employees/actions";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type Division = {
    id: string;
    name: string;
    code: string | null;
    layer: number;
    parent_id: string | null;
};

interface EmployeeFormProps {
    divisions: Division[];
}

const initialState: {
    error?: string;
    success?: boolean;
    message?: string;
} = {};

export default function EmployeeForm({ divisions }: EmployeeFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const [state, formAction, isPending] = useActionState(createEmployee, initialState);

    // 成功したらフォームをリセット
    useEffect(() => {
        if (state?.success) {
            formRef.current?.reset();
        }
    }, [state]);

    // ツリー構造を構築してフラット化
    type DivisionWithChildren = Division & { children?: DivisionWithChildren[] };
    
    const buildTreeAndFlatten = (divs: Division[]): Division[] => {
        if (!divs) return [];
        
        const divisionMap = new Map<string, DivisionWithChildren>();
        const roots: DivisionWithChildren[] = [];

        divs.forEach(div => {
            divisionMap.set(div.id, { ...div, children: [] });
        });

        divs.forEach(div => {
            const node = divisionMap.get(div.id);
            if (!node) return;

            if (div.parent_id) {
                const parent = divisionMap.get(div.parent_id);
                if (parent) {
                    if (!parent.children) parent.children = [];
                    parent.children.push(node);
                } else {
                    roots.push(node);
                }
            } else {
                roots.push(node);
            }
        });

        const sortChildren = (children: DivisionWithChildren[]) => {
            return children.sort((a, b) => {
                if (a.code && b.code) return a.code.localeCompare(b.code);
                if (!a.code && b.code) return 1;
                if (a.code && !b.code) return -1;
                return a.name.localeCompare(b.name);
            });
        };

        const sortRecursive = (nodes: DivisionWithChildren[]) => {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    node.children = sortChildren(node.children);
                    sortRecursive(node.children);
                }
            });
        };

        const sortedRoots = sortChildren(roots);
        sortRecursive(sortedRoots);

        const flattenTree = (nodes: DivisionWithChildren[]): Division[] => {
            const result: Division[] = [];
            nodes.forEach(node => {
                result.push(node);
                if (node.children && node.children.length > 0) {
                    result.push(...flattenTree(node.children));
                }
            });
            return result;
        };

        return flattenTree(sortedRoots);
    };

    const sortedDivisions = buildTreeAndFlatten(divisions);

    return (
        <div className="flex-1 space-y-4">
            <div className="flex flex-col space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">新規社員登録</h2>
                <p className="text-muted-foreground">
                    新しい社員アカウントを作成し、部署と役職を割り当てます。
                </p>
            </div>

            <Card className="shadow-md rounded-lg">
                <CardHeader>
                    <CardTitle>社員情報</CardTitle>
                </CardHeader>
                <CardContent>
                    <form ref={formRef} action={formAction} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">氏名 <span className="text-red-500">*</span></Label>
                            <Input id="name" name="name" placeholder="John Doe" required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス <span className="text-red-500">*</span></Label>
                            <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="division">部署 <span className="text-red-500">*</span></Label>
                                <Select name="division_id" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="部署を選択してください" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sortedDivisions?.map((div) => (
                                            <SelectItem key={div.id} value={div.id}>
                                                {"\u00A0\u00A0".repeat((div.layer || 1) - 1)}
                                                {div.code && <span className="text-gray-500 lowercase mr-2">{div.code}</span>}
                                                <span className="font-medium">{div.name}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">役職 <span className="text-red-500">*</span></Label>
                                <Select name="role" required defaultValue="employee">
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
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="group_name">グループ名</Label>
                            <Input 
                                id="group_name" 
                                name="group_name" 
                                placeholder="例: 開発チームA、営業第二グループ" 
                            />
                            <p className="text-xs text-muted-foreground">
                                従業員が所属するグループ・チーム名を入力してください（任意）
                            </p>
                        </div>

                        {state?.success && (
                            <div className="text-green-700 text-sm p-3 bg-green-50 rounded border border-green-200">
                                ✓ {state.message || "従業員の登録が完了しました。招待メールを送信しました。"}
                            </div>
                        )}

                        {state?.error && (
                            <div className="text-red-500 text-sm p-2 bg-red-50 rounded border border-red-200">
                                {state.error}
                            </div>
                        )}

                        <div className="flex justify-end gap-4 pt-4">
                            <Button variant="outline" asChild>
                                <Link href="/dashboard">キャンセル</Link>
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                登録する
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
