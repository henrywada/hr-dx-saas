"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { addEmployee } from "./actions";
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
} from "@/components/ui/select"; // Selectも必要 (importパス確認)
import { Plus, Loader2 } from "lucide-react";

// Select がない場合は手動で作るか、HTML select で代用するかだが、
// shadcn/ui の Select ある前提。確認ステップで Select.tsx があったのでOK。

export function AddEmployeeDialog() {
    const [open, setOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(addEmployee, null);

    // 成功時にダイアログを閉じる
    useEffect(() => {
        if (state?.success) {
            setOpen(false);
        }
    }, [state?.success]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    社員を追加
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>社員を追加</DialogTitle>
                    <DialogDescription>
                        新しい社員の情報を入力してください。追加後、一覧に反映されます。
                    </DialogDescription>
                </DialogHeader>
                <form action={formAction}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fullName" className="text-right">
                                氏名
                            </Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                placeholder="山田 太郎"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Email
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="taro@example.com"
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="division" className="text-right">
                                部署
                            </Label>
                            <Input
                                id="division"
                                name="division"
                                placeholder="営業部"
                                className="col-span-3"
                            // 今回はDB保存対象外の可能性があるが、UI要件にはあるため配置
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-right">
                                役職
                            </Label>
                            <div className="col-span-3">
                                <Select name="role" required defaultValue="employee">
                                    <SelectTrigger>
                                        <SelectValue placeholder="役職を選択" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="employee">一般社員 (Employee)</SelectItem>
                                        <SelectItem value="hr_manager">人事担当 (HR Manager)</SelectItem>
                                        <SelectItem value="boss">管理者 (Boss)</SelectItem>
                                        <SelectItem value="company_doctor">産業医 (Company Doctor)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* エラー表示 */}
                    {state?.error && (
                        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm text-center">
                            {state.error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isPending ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
