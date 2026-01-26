import { login } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import TokenHandler from "./_components/token-handler";
import { VersionFooter } from "@/components/version-footer";

export default async function LoginPage({
    searchParams,
}: {
    // ★修正1：ここに email?: string を追加
    searchParams: Promise<{ error?: string; email?: string }>;
}) {
    const params = await searchParams;
    const errorMessage = params?.error;
    // ★修正2：emailがあれば取り出し、なければ空文字にする
    const defaultEmail = params?.email || "";

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
            <TokenHandler />
            <div className="flex flex-col gap-6 w-full max-w-md">

                {/* 1. メインログインフォーム */}
                <Card className="w-full shadow-lg border-t-4 border-t-orange-500">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">HR-dx ログイン</CardTitle>
                        <CardDescription className="text-center">
                            人事・組織管理プラットフォーム
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    // ★修正3：初期値（defaultValue）を設定
                                    defaultValue={defaultEmail}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">パスワード</Label>
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                />
                            </div>

                            {errorMessage && (
                                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                                    {decodeURIComponent(errorMessage)}
                                </div>
                            )}

                            <Button formAction={login} className="w-full bg-orange-600 hover:bg-orange-700 font-bold">
                                ログイン
                            </Button>
                        </form>

                        <div className="mt-6 flex flex-col gap-4 text-center text-sm">
                            <Link
                                href="/auth/forgot-password"
                                className="text-gray-500 hover:text-gray-800 hover:underline transition-colors"
                            >
                                パスワードを忘れた方はこちら
                            </Link>
                        </div>
                    </CardContent>
                </Card>



                <VersionFooter />
            </div>
        </div>
    );
}