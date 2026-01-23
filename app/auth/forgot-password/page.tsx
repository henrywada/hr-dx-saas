"use client";

import { useActionState } from "react";
import { forgotPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const [state, action, isPending] = useActionState(forgotPassword, {});

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-orange-500">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">パスワードの再設定</CardTitle>
                    <CardDescription className="text-center">
                        登録しているメールアドレスを入力してください。<br />
                        再設定用のリンクを送信します。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {state?.success ? (
                        <div className="space-y-6 text-center">
                            <div className="text-green-600 bg-green-50 p-4 rounded-md border border-green-200">
                                {state.success}
                            </div>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/login">ログイン画面に戻る</Link>
                            </Button>
                        </div>
                    ) : (
                        <form action={action} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    required
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
                                {isPending ? "送信中..." : "送信する"}
                            </Button>

                            <div className="mt-4 text-center">
                                <Link
                                    href="/login"
                                    className="text-sm text-gray-500 hover:text-gray-800 hover:underline transition-colors"
                                >
                                    ログイン画面に戻る
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
