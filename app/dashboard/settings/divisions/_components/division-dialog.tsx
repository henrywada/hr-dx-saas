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
    division?: Division; // 編集時はデータを渡す
    parentCandidates: Division[]; // 親部署の候補リスト（全部署データ）
    trigger?: React.ReactNode; // トリガーボタンをカスタマイズする場合
}

const initialState = {
    error: "",
    message: "",
    success: false
};

export function DivisionDialog({ division, parentCandidates, trigger }: DivisionDialogProps) {
    const [open, setOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(upsertDivision, initialState);

    // 編集モードかどうか
    const isEdit = !!division;

    // 親部署候補のフィルタリング
    // 1. 自分自身は選べない
    // 2. (高度な実装では) 自分の子孫も選べないようにすべきだが、まずは簡易的に自分を除外
    const validParents = parentCandidates.filter(d => d.id !== division?.id);

    // 成功したらダイアログを閉じる
    useEffect(() => {
        if (state?.success) {
            setOpen(false);
        }
    }, [state]);

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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "部署を編集" : "新規部署登録"}</DialogTitle>
                    <DialogDescription>
                        組織の階層構造を定義します。ストレスチェック等の分析単位となります。
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction}>
                    {/* 編集時はIDを送信 */}
                    {isEdit && <input type="hidden" name="id" value={division.id} />}

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">部署名 <span className="text-red-500">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={division?.name}
                                className="col-span-3"
                                required
                                placeholder="例： 営業本部"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">コード</Label>
                            <Input
                                id="code"
                                name="code"
                                defaultValue={division?.code || ""}
                                placeholder="例： SALES_HQ"
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="parent_id" className="text-right">親部署</Label>
                            <div className="col-span-3">
                                <Select name="parent_id" defaultValue={division?.parent_id || "root"}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="親部署を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="root">-- 指定なし（最上位） --</SelectItem>
                                        {validParents.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {/* 階層を見やすくインデント */}
                                                {"\u00A0\u00A0".repeat((d.layer || 1) - 1)} {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
