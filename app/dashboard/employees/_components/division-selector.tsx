'use client';

import { useState, useTransition } from "react";
import { updateEmployeeDivision } from "../actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner"; // もしトースト通知があれば使用。なければalert等で代用

type Division = {
    id: string;
    name: string;
    layer: number;
};

interface DivisionSelectorProps {
    employeeId: string;
    currentDivisionId: string | null;
    divisions: Division[];
}

export function DivisionSelector({ employeeId, currentDivisionId, divisions }: DivisionSelectorProps) {
    const [isPending, startTransition] = useTransition();
    // 楽観的UIのためにローカルstateを持つ（サーバー更新完了を待たずに切り替える場合など）
    const [value, setValue] = useState(currentDivisionId || "unassigned");

    const handleValueChange = (newValue: string) => {
        setValue(newValue); // UIを即時反映

        startTransition(async () => {
            try {
                await updateEmployeeDivision(employeeId, newValue);
                // 成功時は特に何もしない（revalidatePathでサーバーデータが来るため）
            } catch (error) {
                console.error(error);
                alert("部署の変更に失敗しました");
                setValue(currentDivisionId || "unassigned"); // エラー時は戻す
            }
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Select
                value={value}
                onValueChange={handleValueChange}
                disabled={isPending}
            >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                    {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    ) : (
                        <Building2 className="h-3 w-3 text-muted-foreground mr-2" />
                    )}
                    <SelectValue placeholder="部署を選択" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="unassigned" className="text-muted-foreground">
                        -- 未所属 --
                    </SelectItem>
                    {divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id}>
                            {/* 階層を見やすくインデント表示 */}
                            {"\u00A0\u00A0".repeat((div.layer || 1) - 1)} {div.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}