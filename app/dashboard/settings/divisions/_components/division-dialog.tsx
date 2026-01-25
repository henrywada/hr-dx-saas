'use client';

import { useState, useEffect, useActionState } from "react";
import { upsertDivision } from "../actions";
import { Division } from "../types";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Loader2 } from "lucide-react";

interface DivisionDialogProps {
    editDivision?: Division; // 編集時はデータを渡す
    parentCandidates: Division[]; // 親部署の候補リスト（全部署データ）
    trigger?: React.ReactNode; // トリガーボタンをカスタマイズする場合
}

const initialState = {
    error: "",
    message: "",
    success: false
};

export function DivisionDialog({ editDivision, parentCandidates, trigger }: DivisionDialogProps) {
    const [open, setOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(upsertDivision, initialState);

    // フォーム値を保持するstate
    const [formValues, setFormValues] = useState({
        name: editDivision?.name || "",
        code: editDivision?.code || "",
        layer: editDivision?.layer?.toString() || "1",
        parent_id: editDivision?.parent_id || "root"
    });

    // 編集モードかどうか
    const isEdit = !!editDivision;

    // ツリー構造を構築してフラット化する関数
    const buildTreeAndFlatten = (divisions: Division[]): Division[] => {
        const divisionMap = new Map<string, Division & { children: Division[] }>();
        const roots: (Division & { children: Division[] })[] = [];

        // 全てのノードをマップに登録
        divisions.forEach(div => {
            divisionMap.set(div.id, { ...div, children: [] });
        });

        // 親子関係を構築
        divisions.forEach(div => {
            const node = divisionMap.get(div.id);
            if (!node) return;

            if (div.parent_id) {
                const parent = divisionMap.get(div.parent_id);
                if (parent) {
                    parent.children.push(node);
                } else {
                    roots.push(node);
                }
            } else {
                roots.push(node);
            }
        });

        // ソート関数（code優先）
        const sortChildren = (children: Division[]) => {
            return children.sort((a, b) => {
                if (a.code && b.code) return a.code.localeCompare(b.code);
                if (!a.code && b.code) return 1;
                if (a.code && !b.code) return -1;
                return a.name.localeCompare(b.name);
            });
        };

        // 再帰的にソート
        const sortRecursive = (nodes: Division[]) => {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    node.children = sortChildren(node.children);
                    sortRecursive(node.children);
                }
            });
        };

        const sortedRoots = sortChildren(roots);
        sortRecursive(sortedRoots);

        // 深さ優先探索でフラット化
        const flattenTree = (nodes: Division[]): Division[] => {
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

    // 親部署候補をツリー順にソート（自分自身を除外）
    const validParents = buildTreeAndFlatten(
        parentCandidates.filter(d => d.id !== editDivision?.id)
    );

    // 成功したらダイアログを閉じてフォームをリセット
    useEffect(() => {
        if (state?.success) {
            setOpen(false);
            // フォームをリセット
            setFormValues({
                name: "",
                code: "",
                layer: "1",
                parent_id: "root"
            });
        }
    }, [state]);

    // ダイアログが開いたときに編集データでフォームを初期化
    useEffect(() => {
        if (open && editDivision) {
            setFormValues({
                name: editDivision.name || "",
                code: editDivision.code || "",
                layer: editDivision.layer?.toString() || "1",
                parent_id: editDivision.parent_id || "root"
            });
        }
    }, [open, editDivision]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    isEdit ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
                            <Plus className="h-4 w-4" /> 部署を追加
                        </Button>
                    )
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "部署を編集" : "新規部署登録"}</DialogTitle>
                    <DialogDescription>
                        組織の階層構造を定義します。ストレスチェック等の分析単位となります。
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction}>
                    {/* 編集時はIDを送信 */}
                    {isEdit && <input type="hidden" name="id" value={editDivision.id} />}

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">部署名 <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                value={formValues.name}
                                onChange={(e) => setFormValues(prev => ({ ...prev, name: e.target.value }))}
                                required
                                placeholder="例： 営業本部"
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="code">部署コード</Label>
                            <Input
                                id="code"
                                name="code"
                                value={formValues.code}
                                onChange={(e) => setFormValues(prev => ({ ...prev, code: e.target.value }))}
                                placeholder="例： SALES_HQ"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="layer">
                                レイヤー <span className="text-red-500">*</span>
                            </Label>
                            <Select 
                                name="layer" 
                                value={formValues.layer}
                                onValueChange={(value) => setFormValues(prev => ({ ...prev, layer: value }))}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="階層を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 10 }, (_, i) => i + 1).map(layer => (
                                        <SelectItem key={layer} value={layer.toString()}>
                                            レイヤー{layer}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                このレイヤーは組織分析の集計単位として使用されます
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="parent_id">親部署</Label>
                            <Select 
                                name="parent_id" 
                                value={formValues.parent_id}
                                onValueChange={(value) => setFormValues(prev => ({ ...prev, parent_id: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="親部署を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="root">-- 指定なし（最上位） --</SelectItem>
                                    {validParents.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>
                                            {"\u00A0\u00A0".repeat((d.layer || 1) - 1)}
                                            {d.code && <span className="text-gray-500 lowercase mr-2">{d.code}</span>}
                                            <span className="font-medium">{d.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {state?.error && (
                        <div className="text-red-500 text-sm mb-4 p-2 bg-red-50 rounded border border-red-200">
                            {state.error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending} className="bg-orange-600 hover:bg-orange-700">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            保存
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
