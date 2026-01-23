"use client";

import { useActionState } from "react";
import { ActionState, updatePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const initialState: ActionState = {
    error: "",
    success: "",
};

export default function PasswordUpdateForm() {
    const [state, formAction, isPending] = useActionState(updatePassword, initialState);

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="password">新しいパスワード</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="6文字以上で入力してください"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    placeholder="もう一度入力してください"
                />
            </div>

            {state?.error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <span>{state.error}</span>
                </div>
            )}

            {state?.success && (
                <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{state.success}</span>
                </div>
            )}

            <Button type="submit" disabled={isPending} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
                {isPending ? "更新中..." : "パスワードを設定する"}
            </Button>
        </form>
    );
}
