import { signup } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">アカウント新規登録</CardTitle>
                    <CardDescription className="text-center">
                        新しい会社と管理者アカウントを作成します
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* ここが重要です: action={signup} を指定することで、
             ログイン処理(login)ではなく、登録処理(signup)を呼び出します 
          */}
                    <form action={signup} className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="companyName">会社名</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                placeholder="例: 株式会社ミライ"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="userName">管理者名</Label>
                            <Input
                                id="userName"
                                name="userName"
                                placeholder="例: 山田 太郎"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="admin@demo.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="6文字以上"
                                required
                                minLength={6}
                            />
                        </div>

                        <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                            登録してはじめる
                        </Button>

                        <div className="text-center text-sm mt-4">
                            すでにアカウントをお持ちですか？{" "}
                            <Link href="/login" className="text-blue-600 hover:underline">
                                ログインはこちら
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}