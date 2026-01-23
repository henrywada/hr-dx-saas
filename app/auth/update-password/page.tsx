"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UpdatePasswordPage() {
    const [state, action, isPending] = useActionState(updatePassword, {});
    const router = useRouter();

    useEffect(() => {
        if (state?.success) {
            const timer = setTimeout(() => {
                router.push("/portal");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [state?.success, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-orange-500">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">パスワードの再設定</CardTitle>
                    <CardDescription className="text-center">
                        新しいパスワードを入力してください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {state?.success ? (
                        <div className="space-y-6 text-center">
                            <div className="text-green-600 bg-green-50 p-4 rounded-md border border-green-200">
                                {state.success}
                                <br />
                                <span className="text-sm text-gray-500">
                                    ポータル画面へ移動します...
                                </span>
                            </div>
                        </div>
                    ) : (
                        <form action={action} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">新しいパスワード</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">確認用パスワード</Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                />
                            </div>

                            {state?.error && (
                                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                                    {state.error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-orange-600 hover:bg-orange-700 font-bold"
                                disabled={isPending}
                            >
                                {isPending ? "更新中..." : "パスワードを更新する"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
