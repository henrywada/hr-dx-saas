import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PasswordUpdateForm from "@/components/auth/password-update-form";

export default async function PortalSettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/portal">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-muted-foreground" />
                            <CardTitle>パスワード設定</CardTitle>
                        </div>
                        <CardDescription>
                            ログイン用のパスワードを設定・変更します。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PasswordUpdateForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
