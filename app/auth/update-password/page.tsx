"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { updatePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpdatePasswordPage() {
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const [isAuthenticating, setIsAuthenticating] = useState(!!code);
    const [authError, setAuthError] = useState<string | null>(null);
    const [state, action, isPending] = useActionState(updatePassword, {});
    const router = useRouter();

    // セッション確立処理
    useEffect(() => {
        const establishSession = async () => {
            if (!code) {
                // codeがない場合は既にログイン済みと想定
                setIsAuthenticating(false);
                return;
            }

            const supabase = createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
                console.error("Session establishment error:", error);
                setAuthError("認証に失敗しました: " + error.message);
            }
            
            setIsAuthenticating(false);
        };

        establishSession();
    }, [code]);

    // パスワード更新成功時のリダイレクト
    useEffect(() => {
        if (state?.success) {
            const timer = setTimeout(() => {
                router.push("/login");
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [state?.success, router]);

    // 認証中の表示
    if (isAuthenticating) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md shadow-lg border-t-4 border-t-orange-500">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">認証中...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 認証エラーの表示
    if (authError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <Card className="w-full max-w-md shadow-lg border-t-4 border-t-red-500">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-center text-red-600">
                            認証エラー
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
                            {authError}
                        </div>
                        <Button
                            onClick={() => router.push("/login")}
                            className="w-full mt-4 bg-orange-600 hover:bg-orange-700"
                        >
                            ログイン画面へ戻る
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                                    ログイン画面へ移動します...
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
