import { login } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Building2, Users, UserPlus, ShieldCheck, Briefcase } from "lucide-react";

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
                                href="/forgot-password"
                                className="text-gray-500 hover:text-gray-800 hover:underline transition-colors"
                            >
                                パスワードを忘れた方はこちら
                            </Link>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">または</span>
                                </div>
                            </div>

                            {/* 従業員用：アカウント有効化リンク */}
                            <Button asChild variant="outline" className="w-full border-orange-200 text-orange-700 hover:bg-orange-50">
                                <Link href="/signup">
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    アカウント新規登録（招待された方）
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. 開発・動作確認用メニュー */}
                <Card className="w-full shadow-sm border-dashed border-2 bg-gray-50/50">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            開発者・管理者用メニュー
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4 grid grid-cols-2 gap-3">
                        {/* 開発者用: 会社登録 */}
                        <Button variant="secondary" className="h-auto py-3 flex flex-col gap-1 bg-white hover:bg-gray-100 border col-span-2" asChild>
                            <Link href="/developer/companies/add">
                                <Briefcase className="h-5 w-5 text-purple-600" />
                                <span className="text-xs font-medium">【開発者用】会社登録<br />(Register Company)</span>
                            </Link>
                        </Button>

                        {/* 管理者用ショートカット */}
                        <Button variant="secondary" className="h-auto py-3 flex flex-col gap-1 bg-white hover:bg-gray-100 border" asChild>
                            <Link href="/dashboard/divisions">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                <span className="text-xs font-medium">所属の登録<br />(Divisions)</span>
                            </Link>
                        </Button>
                        <Button variant="secondary" className="h-auto py-3 flex flex-col gap-1 bg-white hover:bg-gray-100 border" asChild>
                            <Link href="/dashboard/employees">
                                <Users className="h-5 w-5 text-green-600" />
                                <span className="text-xs font-medium">従業員管理<br />(Employees)</span>
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}