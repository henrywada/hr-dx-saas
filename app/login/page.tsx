import { login } from "@/app/auth/actions";
// import { Button } from "@/components/ui/button"; <-- Buttonは削除
import { Button } from "@/components/ui/button"; // ログインボタンで使うので残す必要がありました！失礼しました。
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const params = await searchParams;
    const errorMessage = params?.error;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">ログイン</CardTitle>
                    <CardDescription className="text-center">
                        IDとパスワードを入力してください
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">ログインID (メールアドレス)</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
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

                        <Button formAction={login} className="w-full bg-orange-600 hover:bg-orange-700">
                            ログイン
                        </Button>
                    </form>

                    {/* ▼▼▼ ここを修正しました ▼▼▼ */}
                    <div className="mt-6 text-center text-sm">
                        <span className="text-gray-500">アカウントをお持ちでない方は </span>
                        <Link
                            href="/signup"
                            className="font-medium text-orange-600 hover:text-orange-500 hover:underline transition-colors"
                        >
                            新規登録はこちら
                        </Link>
                    </div>
                    {/* ▲▲▲ ここまで ▲▲▲ */}

                </CardContent>
            </Card>
        </div>
    );
}