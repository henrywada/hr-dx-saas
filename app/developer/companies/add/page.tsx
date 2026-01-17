'use client';

import { useActionState } from "react";
import { registerCompany } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";

const initialState = {
    error: "",
    success: false,
    message: ""
};

export default function RegisterCompanyPage() {
    const [state, formAction, isPending] = useActionState(registerCompany, initialState);

    return (
        <div className="container mx-auto py-10 max-w-lg">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">For Developers</span>
                    </div>
                    <CardTitle className="text-2xl">新規ご契約（会社登録）</CardTitle>
                    <CardDescription>
                        新しいクライアント企業と、その管理者を登録します。<br />
                        登録後、管理者は「新規登録」画面から利用を開始できます。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {state.success ? (
                        <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200 flex flex-col gap-2">
                            <div className="flex items-center gap-2 font-bold">
                                <CheckCircle2 className="h-5 w-5" />
                                登録完了
                            </div>
                            <p className="text-sm">{state.message}</p>
                            <Button variant="outline" className="mt-2 w-full bg-white" onClick={() => window.location.reload()}>
                                続けて登録する
                            </Button>
                        </div>
                    ) : (
                        <form action={formAction} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="companyName">会社名 (Tenant Name)</Label>
                                <Input id="companyName" name="companyName" placeholder="株式会社サンプル" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adminName">契約者氏名 (Admin Name)</Label>
                                <Input id="adminName" name="adminName" placeholder="契約 太郎" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="adminEmail">契約者メールアドレス</Label>
                                <Input id="adminEmail" name="adminEmail" type="email" placeholder="admin@client.com" required />
                                <p className="text-xs text-muted-foreground">
                                    このアドレス宛に招待メールを送る運用フローとなります。
                                </p>
                            </div>

                            {state.error && (
                                <div className="text-red-600 text-sm p-2 bg-red-50 rounded border border-red-100">
                                    {state.error}
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                登録する
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}